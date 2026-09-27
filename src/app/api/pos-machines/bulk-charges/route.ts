import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import POSMachine from '@/models/POSMachine'
import { requireRole, isErrorResponse } from '@/lib/auth'
import {
  ChargeRates, getRatesForDate, ratesFromPos, sameRates, sortedHistory,
  toDayKey, upsertHistoryEntry,
} from '@/lib/posCharges'
import { freezeUnfrozenReceipts } from '@/lib/freezeReceipts'

// Monthly / bulk rate update for many POS machines at once.
//
//   POST /api/pos-machines/bulk-charges
//   {
//     scope: { all?: true, brand?: string, segment?: string, machineIds?: string[] },
//     commissionPercentage?: number | '',   // '' / missing = keep each machine's own value
//     bankCharges?: number | '',
//     vatPercentage?: number | '',
//     effectiveFrom: 'yyyy-MM-dd',
//     note?: string,
//     dryRun?: boolean                        // true = preview only, writes nothing
//   }
//
// Safety:
//   • Adds a dated entry to each machine's chargeHistory — nothing is overwritten.
//   • Receipts already entered are NEVER re-priced here: any receipt without frozen
//     rates is locked to the rates it shows now before the change is saved.
//   • Receipts entered from now on, dated on/after effectiveFrom, get the new rates.

const BASELINE_DATE = '2000-01-01'

const optionalRate = (v: any): number | null => {
  if (v === '' || v === null || v === undefined) return null
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : NaN
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth
    await connectDB()

    const body = await request.json()
    const { scope = {}, effectiveFrom, note, dryRun } = body || {}

    const effectiveKey = toDayKey(effectiveFrom)
    if (!effectiveKey || !/^\d{4}-\d{2}-\d{2}$/.test(String(effectiveFrom))) {
      return NextResponse.json({ error: 'Valid "effective from" date (yyyy-MM-dd) is required' }, { status: 400 })
    }

    const input = {
      commissionPercentage: optionalRate(body.commissionPercentage),
      bankCharges: optionalRate(body.bankCharges),
      vatPercentage: optionalRate(body.vatPercentage),
    }
    for (const [k, v] of Object.entries(input)) {
      if (v !== null && (Number.isNaN(v) || v < 0 || v > 100)) {
        return NextResponse.json({ error: `${k} must be between 0 and 100` }, { status: 400 })
      }
    }
    if (input.commissionPercentage === null && input.bankCharges === null && input.vatPercentage === null) {
      return NextResponse.json({ error: 'Enter at least one rate to change' }, { status: 400 })
    }

    const query: any = {}
    if (Array.isArray(scope.machineIds) && scope.machineIds.length) query._id = { $in: scope.machineIds }
    else if (!scope.all) {
      if (scope.brand) query.brand = scope.brand
      if (scope.segment) query.segment = scope.segment
      if (!scope.brand && !scope.segment) {
        return NextResponse.json({ error: 'Choose which machines to update' }, { status: 400 })
      }
    }

    const machines = await POSMachine.find(query).sort({ terminalId: 1 })
    const todayKey = toDayKey(new Date())
    const preview: any[] = []
    let changedCount = 0

    for (const m of machines as any[]) {
      let history: any[] = sortedHistory(m).map((h: any) => (h.toObject ? h.toObject() : { ...h }))
      if (history.length === 0) {
        upsertHistoryEntry(history, ratesFromPos(m), BASELINE_DATE, m.createdBy, 'Baseline (rates before date-wise history)')
      }

      const before: ChargeRates = getRatesForDate({ chargeHistory: history }, effectiveKey)
      const after: ChargeRates = {
        commissionPercentage: input.commissionPercentage ?? before.commissionPercentage,
        bankCharges: input.bankCharges ?? before.bankCharges,
        vatPercentage: input.vatPercentage ?? before.vatPercentage,
      }
      const changed = !sameRates(before, after)

      preview.push({
        _id: m._id,
        machineName: m.machineName,
        terminalId: m.terminalId,
        brand: m.brand,
        segment: m.segment,
        before,
        after,
        changed,
      })
      if (!changed) continue
      changedCount++

      if (!dryRun) {
        // Lock this machine's existing receipts to their current rates first.
        await freezeUnfrozenReceipts(m)
        upsertHistoryEntry(history, after, effectiveKey, auth.userId, typeof note === 'string' ? note.trim() : '')
        history = sortedHistory({ chargeHistory: history })
        const todayRates = getRatesForDate({ chargeHistory: history }, todayKey)
        await POSMachine.updateOne(
          { _id: m._id },
          { $set: { chargeHistory: history, ...todayRates, updatedBy: auth.userId } },
        )
      }
    }

    return NextResponse.json({
      dryRun: !!dryRun,
      effectiveFrom: effectiveKey,
      matched: machines.length,
      changed: changedCount,
      unchanged: machines.length - changedCount,
      backdated: effectiveKey < todayKey,
      preview,
      message: dryRun
        ? `Preview only — ${changedCount} of ${machines.length} machine(s) would get new rates from ${effectiveKey}`
        : `${changedCount} machine(s) updated. New rates apply to receipts dated ${effectiveKey} onwards.`,
    })
  } catch (error: any) {
    console.error('bulk-charges error:', error)
    return NextResponse.json({ error: 'Bulk rate update failed', details: error.message }, { status: 500 })
  }
}
