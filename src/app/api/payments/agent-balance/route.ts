import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import '@/models/POSMachine'
import { requireRole, isErrorResponse } from '@/lib/auth'

import { calcFinancials, getReceiptRates, POS_RATE_FIELDS } from '@/lib/posCharges'

// Shared calculation — single source of truth lives in src/lib/posCharges.ts.
// Pass the RECEIPT (not the POS machine) so its own date-correct rates are used.
export function calcReceiptFinancials(amount: number, receipt: any) {
  return calcFinancials(amount, getReceiptRates(receipt))
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (isErrorResponse(auth)) return auth

  await connectDB()

  const agentId = new URL(request.url).searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  const receipts = await Transaction.find({ type: 'receipt', agentId })
    .populate('posMachine', POS_RATE_FIELDS)
    .sort({ createdAt: 1 })

  let totalToPay = 0
  let totalNetReceived = 0

  const receiptDetails = receipts.map((r: any) => {
    const amount = r.amount || 0
    const fin = calcReceiptFinancials(amount, r)
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

  const totalPaid = receiptDetails.reduce((s: number, r: any) => s + r.paidAmount + r.settlementAmount, 0)
  const totalDue = receiptDetails.reduce((s: number, r: any) => s + r.dueAmount, 0)
  const openReceipts = receiptDetails.filter((r: any) => r.dueAmount > 0.001)

  return NextResponse.json({
    totalToPay,
    totalNetReceived,
    totalPaid,
    totalDue,
    openReceiptsCount: openReceipts.length,
    receipts: openReceipts,
  })
}
