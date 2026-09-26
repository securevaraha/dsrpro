import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import POSMachine from '@/models/POSMachine'
import Notification from '@/models/Notification'
import '@/models/User'
import { requireRole, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'
import Transaction from '@/models/Transaction'
import {
  ChargeRates, getRatesForDate, ratesFromPos, sameRates, sortedHistory,
  toDayKey, toDayStart, upsertHistoryEntry, buildRateSnapshot, calcFinancials,
} from '@/lib/posCharges'

const BASELINE_DATE = '2000-01-01'

const parseRate = (v: any, fallback: number) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { id } = await params
    const body = await request.json()
    const { machineName, segment, brand, terminalId, merchantId, serialNumber, model, deviceType, assignedAgent, location, bankCharges, vatPercentage, commissionPercentage, status, notes, chargesEffectiveFrom, applyToExisting, chargesNote } = body

    const existing = await POSMachine.findById(id)
    if (!existing) {
      return NextResponse.json({ error: 'POS Machine not found' }, { status: 404 })
    }

    if (terminalId && terminalId.trim() !== existing.terminalId) {
      const dup = await POSMachine.findOne({ terminalId: terminalId.trim(), _id: { $ne: id } })
      if (dup) return NextResponse.json({ error: 'Terminal ID already in use' }, { status: 400 })
    }

    const updateData = addAuditFields({
      ...(typeof machineName === 'string' && { machineName: machineName.trim() }),
      ...(typeof segment === 'string' && { segment: segment.trim() }),
      ...(brand && { brand }),
      ...(typeof terminalId === 'string' && { terminalId: terminalId.trim() }),
      ...(typeof merchantId === 'string' && { merchantId: merchantId.trim() }),
      ...(typeof serialNumber === 'string' && { serialNumber: serialNumber?.trim() || '' }),
      ...(typeof model === 'string' && { model: model?.trim() || '' }),
      ...(deviceType && { deviceType }),
      ...(assignedAgent !== undefined && { assignedAgent: assignedAgent || null }),
      ...(typeof location === 'string' && { location: location.trim() }),
      ...(status && { status }),
      ...(typeof notes === 'string' && { notes: notes.trim() }),
    }, auth.userId, true)

    // ── Charges: record a dated change instead of overwriting history ──────────
    // Rates effective today (top-level fields can lag behind a scheduled change).
    const currentRates = sortedHistory(existing).length ? getRatesForDate(existing, new Date()) : ratesFromPos(existing)
    const submittedRates: ChargeRates = {
      commissionPercentage: typeof commissionPercentage !== 'undefined' ? parseRate(commissionPercentage, 0) : currentRates.commissionPercentage,
      bankCharges: typeof bankCharges !== 'undefined' ? parseRate(bankCharges, 0) : currentRates.bankCharges,
      vatPercentage: typeof vatPercentage !== 'undefined' ? parseRate(vatPercentage, 5) : currentRates.vatPercentage,
    }

    const todayKey = toDayKey(new Date())
    const effectiveKey = chargesEffectiveFrom ? toDayKey(chargesEffectiveFrom) : todayKey
    if (!effectiveKey) {
      return NextResponse.json({ error: 'Invalid "Charges effective from" date' }, { status: 400 })
    }

    // Seed a baseline from the machine's pre-existing rates so receipts that
    // were recorded before any history existed keep pricing exactly as before.
    let history: any[] = sortedHistory(existing).map((h: any) => (h.toObject ? h.toObject() : { ...h }))
    if (history.length === 0) {
      upsertHistoryEntry(history, currentRates, BASELINE_DATE, existing.createdBy, 'Baseline (rates before date-wise history)')
    }

    let chargesChanged = false
    let reappliedReceipts = 0
    const ratesOnEffectiveDate = getRatesForDate({ chargeHistory: history }, effectiveKey)
    if (!sameRates(submittedRates, ratesOnEffectiveDate)) {
      upsertHistoryEntry(history, submittedRates, effectiveKey, auth.userId, typeof chargesNote === 'string' ? chargesNote.trim() : '')
      chargesChanged = true
    }
    history = sortedHistory({ chargeHistory: history })

    // Top-level fields always mirror the rates effective today.
    const todayRates = getRatesForDate({ chargeHistory: history }, todayKey)
    Object.assign(updateData, todayRates, { chargeHistory: history })

    const machine = await POSMachine.findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedAgent', 'name email companyName')

    if (machine && machine.assignedAgent && machine.assignedAgent._id.toString() !== existing.assignedAgent?.toString()) {
      try {
        await Notification.create({
          userId: machine.assignedAgent._id,
          title: 'POS Machine Assigned',
          message: `A POS Machine (TID: ${machine.terminalId}, Brand: ${machine.brand}) has been assigned to you.`,
          type: 'info',
        })
      } catch (err) {
        console.error('Failed to create notification:', err)
      }
    }

    // Optional, explicit: re-price receipts already recorded on/after the
    // effective date (only up to the next scheduled change). Never automatic.
    if (chargesChanged && applyToExisting === true && machine) {
      const from = toDayStart(effectiveKey)
      const next = history.find((h: any) => toDayKey(h.effectiveFrom) > effectiveKey)
      const to = next ? toDayStart(next.effectiveFrom) : null
      const range: any = to ? { $gte: from, $lt: to } : { $gte: from }
      const receipts = await Transaction.find({
        type: 'receipt',
        posMachine: machine._id,
        $or: [{ date: range }, { date: null, createdAt: range }],
      })
      for (const r of receipts as any[]) {
        const snap = buildRateSnapshot(machine, r.date || r.createdAt)
        const fin = calcFinancials(r.amount || 0, snap)
        // Money already paid/settled is never touched — only the due is recomputed.
        const paid = r.paidAmount || 0
        const settled = r.settlementAmount || 0
        await Transaction.updateOne({ _id: r._id }, {
          $set: {
            chargeRates: snap,
            dueAmount: Math.max(0, fin.toPayAmount - paid - settled),
            updatedBy: auth.userId,
          },
        })
        reappliedReceipts++
      }
    }

    return NextResponse.json({ message: 'POS Machine updated', machine, chargesChanged, chargesEffectiveFrom: chargesChanged ? effectiveKey : null, reappliedReceipts })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update POS machine' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { id } = await params
    const machine = await POSMachine.findByIdAndDelete(id)
    if (!machine) {
      return NextResponse.json({ error: 'POS Machine not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'POS Machine deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete POS machine' }, { status: 500 })
  }
}
