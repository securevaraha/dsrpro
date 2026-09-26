// ─── POS charge rates: date-effective resolution ─────────────────────────────
//
// Root cause this fixes:
//   Charges % / Bank Charges % / VAT % live only on the POSMachine document and
//   every screen, report and balance recalculated receipts from the machine's
//   CURRENT values. Editing a machine's rates therefore silently rewrote every
//   historical receipt (and re-opened / changed the due of already-paid ones).
//
// How it works now:
//   1. Each receipt stores a snapshot of the rates it was created with
//      (Transaction.chargeRates). That snapshot is what gets used forever.
//   2. POSMachine.chargeHistory keeps every rate change with an effectiveFrom
//      date, so a receipt is priced by the rates valid on ITS date — not today's.
//   3. Legacy receipts without a snapshot fall back to history for their date,
//      then to the machine's current values (identical to old behaviour until
//      the migration freezes them).

export interface ChargeRates {
  commissionPercentage: number
  bankCharges: number
  vatPercentage: number
}

export interface ChargeHistoryEntry extends ChargeRates {
  effectiveFrom: Date | string
  changedAt?: Date | string
  changedBy?: any
  note?: string
}

const num = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** YYYY-MM-DD in UTC. Receipt dates are saved from 'yyyy-MM-dd' strings (UTC midnight). */
export function toDayKey(d: Date | string | null | undefined): string {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 10)
}

/** Parse a 'yyyy-MM-dd' (or any date) into UTC midnight of that day. */
export function toDayStart(d: Date | string): Date {
  const key = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : toDayKey(d)
  return new Date(`${key}T00:00:00.000Z`)
}

export function ratesFromPos(pos: any): ChargeRates {
  return {
    commissionPercentage: num(pos?.commissionPercentage),
    bankCharges: num(pos?.bankCharges),
    vatPercentage: num(pos?.vatPercentage),
  }
}

export function sameRates(a: ChargeRates, b: ChargeRates) {
  return (
    num(a.commissionPercentage) === num(b.commissionPercentage) &&
    num(a.bankCharges) === num(b.bankCharges) &&
    num(a.vatPercentage) === num(b.vatPercentage)
  )
}

/** History sorted oldest → newest by effectiveFrom. */
export function sortedHistory(pos: any): ChargeHistoryEntry[] {
  const hist: ChargeHistoryEntry[] = Array.isArray(pos?.chargeHistory) ? pos.chargeHistory : []
  return [...hist]
    .filter((h) => toDayKey(h.effectiveFrom))
    .sort((a, b) => {
      const d = toDayKey(a.effectiveFrom).localeCompare(toDayKey(b.effectiveFrom))
      if (d !== 0) return d
      return new Date(a.changedAt || 0).getTime() - new Date(b.changedAt || 0).getTime()
    })
}

/**
 * Rates of a POS machine that were effective on a given date.
 * - latest history entry with effectiveFrom <= date wins
 * - date earlier than all history → earliest entry (baseline)
 * - no history (or no POS) → machine's current values
 */
export function getRatesForDate(pos: any, date: Date | string | null | undefined): ChargeRates {
  if (!pos) return ratesFromPos(null)
  const hist = sortedHistory(pos)
  if (hist.length === 0) return ratesFromPos(pos)
  const key = toDayKey(date) || toDayKey(new Date())
  let match: ChargeHistoryEntry | null = null
  for (const h of hist) {
    if (toDayKey(h.effectiveFrom) <= key) match = h
    else break
  }
  return ratesFromPos(match || hist[0])
}

export function hasSnapshot(txn: any): boolean {
  const s = txn?.chargeRates
  return !!s && s.commissionPercentage != null && s.bankCharges != null && s.vatPercentage != null
}

/** The rates to use for a receipt: its frozen snapshot, else POS history for its date. */
export function getReceiptRates(txn: any): ChargeRates {
  if (hasSnapshot(txn)) return ratesFromPos(txn.chargeRates)
  const pos = txn?.posMachine && typeof txn.posMachine === 'object' ? txn.posMachine : null
  return getRatesForDate(pos, txn?.date || txn?.createdAt)
}

// amount=100, charges=3.75%, bankCharges=2.7%, VAT=5%
//   chargesAmount     = 100 × 3.75% = 3.75
//   bankChargesAmount = 100 × 2.7%  = 2.70
//   vatAmount         = 2.70 × 5%   = 0.135  ← VAT on BANK CHARGES amount
//   netReceived       = 100 - 2.70 - 0.135 = 97.165
//   toPayAmount       = 100 - 3.75         = 96.25
//   marginAmount      = 97.165 - 96.25     = 0.915   (admin's earning)
export function calcFinancials(amount: number, rates: Partial<ChargeRates> | null | undefined) {
  const chargesPercent     = num(rates?.commissionPercentage)
  const bankChargesPercent = num(rates?.bankCharges)
  const vatPercent         = num(rates?.vatPercentage)

  const chargesAmount     = (amount * chargesPercent)     / 100
  const bankChargesAmount = (amount * bankChargesPercent) / 100
  const vatAmount         = (bankChargesAmount * vatPercent) / 100

  const netReceived  = amount - bankChargesAmount - vatAmount
  const toPayAmount  = amount - chargesAmount
  const marginAmount = netReceived - toPayAmount

  return {
    chargesPercent,
    chargesAmount,
    bankChargesPercent,
    bankChargesAmount,
    vatPercent,
    vatAmount,
    netReceived,
    toPayAmount,
    marginAmount,
    // Legacy aliases retained for existing consumers.
    marginPercent: chargesPercent,
    finalMargin: marginAmount,
  }
}

/** Financials of a receipt using its own (date-correct) rates. */
export function receiptFinancials(txn: any) {
  return calcFinancials(Number(txn?.amount || 0), getReceiptRates(txn))
}

/** Fields populated from POSMachine wherever receipts are priced. */
export const POS_RATE_FIELDS = 'bankCharges vatPercentage commissionPercentage chargeHistory'

/** Snapshot to store on a receipt: the POS rates effective on the receipt date. */
export function buildRateSnapshot(pos: any, date: Date | string | null | undefined) {
  const rates = getRatesForDate(pos, date)
  const hist = sortedHistory(pos)
  const key = toDayKey(date) || toDayKey(new Date())
  let effectiveFrom: Date | undefined
  for (const h of hist) {
    if (toDayKey(h.effectiveFrom) <= key) effectiveFrom = new Date(h.effectiveFrom)
    else break
  }
  return { ...rates, ...(effectiveFrom ? { effectiveFrom } : {}), capturedAt: new Date() }
}

/**
 * Add a rate change to a POS machine's history (mutates `history`, returns it).
 * An existing entry with the same effectiveFrom day is replaced (correction).
 */
export function upsertHistoryEntry(
  history: ChargeHistoryEntry[],
  rates: ChargeRates,
  effectiveFrom: Date | string,
  changedBy?: any,
  note?: string,
): ChargeHistoryEntry[] {
  const key = toDayKey(effectiveFrom)
  const entry: ChargeHistoryEntry = {
    ...ratesFromPos(rates),
    effectiveFrom: toDayStart(effectiveFrom),
    changedAt: new Date(),
    ...(changedBy ? { changedBy } : {}),
    note: note || '',
  }
  const idx = history.findIndex((h) => toDayKey(h.effectiveFrom) === key)
  if (idx >= 0) history[idx] = entry
  else history.push(entry)
  return history
}
