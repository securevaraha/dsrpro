import Transaction from '@/models/Transaction'
import { buildRateSnapshot } from '@/lib/posCharges'

/**
 * Safety net for every rate change.
 *
 * Call with the POS machine as it is BEFORE the change. Every receipt of this
 * machine that has no frozen rates yet gets the rates it is shown with right
 * now. After this, no rate change (any date, back-dated or not) can alter an
 * existing receipt — only receipts entered later pick up the new rates.
 *
 * Idempotent: receipts that already have a snapshot are never touched.
 * Amounts (paid / settlement / due) are not modified.
 */
export async function freezeUnfrozenReceipts(posBeforeChange: any): Promise<number> {
  if (!posBeforeChange?._id) return 0
  const txns = await Transaction.find({
    posMachine: posBeforeChange._id,
    'chargeRates.commissionPercentage': { $exists: false },
  }).select('_id date createdAt').lean()
  if (!txns.length) return 0

  const ops = (txns as any[]).map((t) => ({
    updateOne: {
      filter: { _id: t._id, 'chargeRates.commissionPercentage': { $exists: false } },
      update: { $set: { chargeRates: buildRateSnapshot(posBeforeChange, t.date || t.createdAt) } },
    },
  }))
  for (let i = 0; i < ops.length; i += 500) {
    await Transaction.bulkWrite(ops.slice(i, i + 500), { ordered: false })
  }
  return ops.length
}
