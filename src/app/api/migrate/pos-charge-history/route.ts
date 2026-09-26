import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import POSMachine from '@/models/POSMachine'
import Transaction from '@/models/Transaction'
import { requireRole, isErrorResponse } from '@/lib/auth'
import { buildRateSnapshot, ratesFromPos, sortedHistory } from '@/lib/posCharges'

// One-time, idempotent migration for date-wise POS charges.
//
//   POST /api/migrate/pos-charge-history?dryRun=1   → counts only, writes nothing
//   POST /api/migrate/pos-charge-history            → applies
//
// 1. Every POS machine without history gets ONE baseline entry holding its
//    current rates, effective from 2000-01-01.
// 2. Every POS-linked transaction without a rate snapshot gets the rates it is
//    shown with TODAY frozen onto it.
// Result: every amount on every screen stays exactly what it is now; from here
// on, rate changes only affect receipts dated on/after their effective date.
// Amounts (paid / settlement / due) are NOT modified.
export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const dryRun = ['1', 'true'].includes(new URL(request.url).searchParams.get('dryRun') || '')

    // ── 1. Baseline history on machines ───────────────────────────────────────
    const machines = await POSMachine.find({})
    const machineById = new Map<string, any>()
    let machinesSeeded = 0
    for (const m of machines as any[]) {
      if (sortedHistory(m).length === 0) {
        const baseline = {
          ...ratesFromPos(m),
          effectiveFrom: new Date('2000-01-01T00:00:00.000Z'),
          changedAt: new Date(),
          changedBy: auth.userId,
          note: 'Baseline (rates before date-wise history)',
        }
        machinesSeeded++
        if (!dryRun) {
          await POSMachine.updateOne({ _id: m._id }, { $set: { chargeHistory: [baseline] } })
        }
        m.chargeHistory = [baseline]
      }
      machineById.set(m._id.toString(), m)
    }

    // ── 2. Freeze rates on existing transactions ──────────────────────────────
    const txns = await Transaction.find({
      posMachine: { $ne: null },
      'chargeRates.commissionPercentage': { $exists: false },
    }).select('_id posMachine date createdAt')

    let transactionsFrozen = 0
    let missingMachine = 0
    const ops: any[] = []
    for (const t of txns as any[]) {
      const pos = machineById.get(String(t.posMachine))
      if (!pos) { missingMachine++; continue }
      ops.push({
        updateOne: {
          filter: { _id: t._id, 'chargeRates.commissionPercentage': { $exists: false } },
          update: { $set: { chargeRates: buildRateSnapshot(pos, t.date || t.createdAt) } },
        },
      })
      transactionsFrozen++
    }
    if (!dryRun) {
      for (let i = 0; i < ops.length; i += 500) {
        await Transaction.bulkWrite(ops.slice(i, i + 500), { ordered: false })
      }
    }

    return NextResponse.json({
      message: dryRun ? 'Dry run — nothing written' : 'Migration completed',
      dryRun,
      machinesSeeded,
      transactionsFrozen,
      transactionsSkippedMachineDeleted: missingMachine,
    })
  } catch (error: any) {
    console.error('pos-charge-history migration error:', error)
    return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 })
  }
}
