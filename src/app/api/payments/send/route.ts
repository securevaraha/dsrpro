import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import Notification from '@/models/Notification'
import { requireRole, isErrorResponse } from '@/lib/auth'
import { calcReceiptFinancials } from '../agent-balance/route'

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (isErrorResponse(auth)) return auth

  await connectDB()

  const { agentId, amount, paymentMethod, description, date } = await request.json()

  if (!agentId || !amount || amount <= 0) {
    return NextResponse.json({ error: 'agentId and positive amount required' }, { status: 400 })
  }

  // Get all receipts oldest first (FIFO)
  const receipts = await Transaction.find({ type: 'receipt', agentId })
    .populate('posMachine', 'bankCharges vatPercentage commissionPercentage')
    .sort({ createdAt: 1 })

  let outstandingDueBefore = 0
  for (const r of receipts as any[]) {
    const fin = calcReceiptFinancials(r.amount || 0, r.posMachine)
    const alreadyPaid = Math.min(r.paidAmount || 0, fin.toPayAmount)
    const alreadySettled = Math.min(r.settlementAmount || 0, Math.max(0, fin.toPayAmount - alreadyPaid))
    outstandingDueBefore += Math.max(0, fin.toPayAmount - alreadyPaid - alreadySettled)
  }

  if (outstandingDueBefore <= 0.001) {
    return NextResponse.json({ error: 'No outstanding due for this agent' }, { status: 400 })
  }

  let remaining = parseFloat(amount)
  const updates: { id: string; paidAmount: number; dueAmount: number }[] = []

  for (const r of receipts as any[]) {
    const fin = calcReceiptFinancials(r.amount || 0, r.posMachine)
    const alreadyPaid = Math.min(r.paidAmount || 0, fin.toPayAmount)
    const alreadySettled = Math.min(r.settlementAmount || 0, Math.max(0, fin.toPayAmount - alreadyPaid))
    const due = Math.max(0, fin.toPayAmount - alreadyPaid - alreadySettled)

    if (due <= 0.001 || remaining <= 0) continue

    const payNow = Math.min(remaining, due)
    const newPaid = alreadyPaid + payNow
    const newDue = Math.max(0, fin.toPayAmount - newPaid - alreadySettled)

    updates.push({ id: r._id.toString(), paidAmount: newPaid, dueAmount: newDue })
    remaining -= payNow
  }

  const appliedAmount = parseFloat(amount) - remaining
  const outstandingDueAfter = Math.max(0, outstandingDueBefore - appliedAmount)

  if (appliedAmount <= 0.001) {
    return NextResponse.json({ error: 'No payable due was applied' }, { status: 400 })
  }

  // Update paidAmount/dueAmount on each receipt — no new transaction row created
  for (const u of updates) {
    await Transaction.findByIdAndUpdate(u.id, {
      paidAmount: u.paidAmount,
      dueAmount: u.dueAmount,
      updatedBy: auth.userId,
    })
  }

  // Create payment history entry so it appears on Payments page.
  const paymentTxId = `PAY${Date.now()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  await Transaction.create({
    transactionId: paymentTxId,
    type: 'payment',
    agentId,
    amount: appliedAmount,
    paymentMethod: paymentMethod || 'cash',
    description: description?.trim() || `Admin payment sent to agent`,
    status: 'completed',
    ...(date ? { date: new Date(date) } : {}),
    createdBy: auth.userId,
    updatedBy: auth.userId,
    metadata: {
      paymentNumber: paymentTxId,
      source: 'manual-payment',
      outstandingDueBefore,
      outstandingDueAfter,
    },
  })

  try {
    await Notification.create({
      userId: agentId,
      title: 'Payment Received',
      message: `Admin sent you AED ${parseFloat(amount).toFixed(2)}.`,
      type: 'success',
    })
  } catch {}

  return NextResponse.json({
    message: 'Payment sent',
    inputAmount: parseFloat(amount),
    appliedAmount,
    unappliedAmount: Math.max(0, remaining),
    outstandingDueBefore,
    outstandingDueAfter,
    remainingDue: outstandingDueAfter,
    updatedReceipts: updates.length,
    paymentTransactionId: paymentTxId,
  })
}
