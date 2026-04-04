import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import { requireRole, isErrorResponse } from '@/lib/auth'

// Shared calculation — single source of truth used everywhere
// amount=100, bankCharges=5%, VAT=5%, margin=10%
//   netReceived = 100 - 5 - 5      = 90  (admin receives from bank)
//   toPayAmount = 100 - 5 - 5 - 10 = 80  (admin pays agent after ALL charges)
export function calcReceiptFinancials(amount: number, pos: any) {
  const marginPercent      = pos?.commissionPercentage || 0
  const bankChargesPercent = pos?.bankCharges          || 0
  const vatPercent         = pos?.vatPercentage        || 0

  const marginAmount      = (amount * marginPercent)      / 100
  const bankChargesAmount = (amount * bankChargesPercent) / 100
  const vatAmount         = (amount * vatPercent)         / 100  // VAT on full amount

  const netReceived  = amount - bankChargesAmount - vatAmount
  const toPayAmount  = amount - bankChargesAmount - vatAmount - marginAmount
  const finalMargin  = marginAmount - bankChargesAmount - vatAmount

  return { marginPercent, marginAmount, bankChargesPercent, bankChargesAmount, vatPercent, vatAmount, toPayAmount, netReceived, finalMargin }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (isErrorResponse(auth)) return auth

  await connectDB()

  const agentId = new URL(request.url).searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  const receipts = await Transaction.find({ type: 'receipt', agentId })
    .populate('posMachine', 'bankCharges vatPercentage commissionPercentage')
    .sort({ createdAt: 1 })

  let totalToPay = 0
  let totalNetReceived = 0

  const receiptDetails = receipts.map((r: any) => {
    const amount = r.amount || 0
    const fin = calcReceiptFinancials(amount, r.posMachine)
    totalToPay += fin.toPayAmount
    totalNetReceived += fin.netReceived

    const paidAmount = Math.min(r.paidAmount || 0, fin.toPayAmount)
    const settlementAmount = Math.min(r.settlementAmount || 0, Math.max(0, fin.toPayAmount - paidAmount))
    const dueAmount = Math.max(0, fin.toPayAmount - paidAmount - settlementAmount)

    return {
      _id: r._id,
      transactionId: r.transactionId,
      amount,
      ...fin,
      paidAmount,
      settlementAmount,
      dueAmount,
    }
  })

  const totalPaid = receiptDetails.reduce((s: number, r: any) => s + r.paidAmount, 0)
  const totalDue = totalToPay - totalPaid

  return NextResponse.json({
    totalToPay,
    totalNetReceived,
    totalPaid,
    totalDue,
    receipts: receiptDetails,
  })
}
