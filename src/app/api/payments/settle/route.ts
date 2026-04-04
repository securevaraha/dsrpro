import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import { requireRole, isErrorResponse } from '@/lib/auth'
import { calcReceiptFinancials } from '../agent-balance/route'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (isErrorResponse(auth)) return auth

  await connectDB()

  const receipts = await Transaction.find({ type: 'receipt' })
    .populate('agentId', 'name')
    .populate('posMachine', 'bankCharges vatPercentage commissionPercentage')
    .sort({ createdAt: -1 })

  const grouped: Record<string, any> = {}

  for (const r of receipts as any[]) {
    const fin = calcReceiptFinancials(r.amount || 0, r.posMachine)
    const paidAmount = Math.min(r.paidAmount || 0, fin.toPayAmount)
    const settlementAmount = Math.min(r.settlementAmount || 0, Math.max(0, fin.toPayAmount - paidAmount))
    const dueAmount = Math.max(0, fin.toPayAmount - paidAmount - settlementAmount)
    if (dueAmount <= 0.001) continue

    const agentKey = r.agentId?._id?.toString() || 'unassigned'
    if (!grouped[agentKey]) {
      grouped[agentKey] = {
        _id: agentKey,
        transactionId: `SETTLE-${agentKey.slice(-6).toUpperCase()}`,
        agentId: r.agentId ? { _id: r.agentId._id.toString(), name: r.agentId.name || 'Unknown Agent' } : null,
        amount: 0,
        paymentMethod: 'settlement',
        description: '',
        status: 'due',
        createdAt: r.createdAt,
        createdBy: { name: 'System' },
        receiptCount: 0,
      }
    }

    grouped[agentKey].amount += dueAmount
    grouped[agentKey].receiptCount += 1
    if (new Date(r.createdAt).getTime() > new Date(grouped[agentKey].createdAt).getTime()) {
      grouped[agentKey].createdAt = r.createdAt
    }
  }

  const items = Object.values(grouped)
    .map((g: any) => ({
      ...g,
      description: `Outstanding due across ${g.receiptCount} receipt(s)`,
    }))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json({
    transactions: items,
    total: items.length,
    totalOutstanding: items.reduce((sum: number, item: any) => sum + item.amount, 0),
  })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (isErrorResponse(auth)) return auth

  await connectDB()

  const { agentId, note } = await request.json()
  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }

  const receipts = await Transaction.find({ type: 'receipt', agentId })
    .populate('posMachine', 'bankCharges vatPercentage commissionPercentage')
    .sort({ createdAt: 1 })

  let settledReceipts = 0
  let settledAmount = 0

  for (const r of receipts as any[]) {
    const fin = calcReceiptFinancials(r.amount || 0, r.posMachine)
    const paidAmount = Math.min(r.paidAmount || 0, fin.toPayAmount)
    const existingSettlement = Math.min(r.settlementAmount || 0, Math.max(0, fin.toPayAmount - paidAmount))
    const dueAmount = Math.max(0, fin.toPayAmount - paidAmount - existingSettlement)
    if (dueAmount <= 0.001) continue

    const updateData: any = {
      settlementAmount: existingSettlement + dueAmount,
      dueAmount: 0,
      status: 'completed',
      updatedBy: auth.userId,
    }

    if (note && String(note).trim()) {
      updateData.description = r.description
        ? `${r.description} | Settlement note: ${String(note).trim()}`
        : `Settlement note: ${String(note).trim()}`
    }

    await Transaction.findByIdAndUpdate(r._id, updateData)
    settledReceipts += 1
    settledAmount += dueAmount
  }

  if (settledAmount > 0.001) {
    const openManualPayment = await Transaction.findOne({
      type: 'payment',
      agentId,
      status: 'completed',
      'metadata.source': 'manual-payment',
      'metadata.outstandingDueAfter': { $gt: 0 },
    }).sort({ createdAt: -1 })

    if (openManualPayment) {
      const previousAmount = Number(openManualPayment.amount || 0)
      const previousRemaining = Number(openManualPayment.metadata?.outstandingDueAfter || 0)
      const mergedAmount = previousAmount + settledAmount
      const mergedRemaining = Math.max(0, previousRemaining - settledAmount)

      await Transaction.findByIdAndUpdate(openManualPayment._id, {
        amount: mergedAmount,
        updatedBy: auth.userId,
        ...(note && String(note).trim()
          ? { description: `${openManualPayment.description || 'Admin payment sent to agent'} | Settlement note: ${String(note).trim()}` }
          : {}),
        'metadata.outstandingDueAfter': mergedRemaining,
      })
    } else {
      const paymentTxId = `PAY${Date.now()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
      await Transaction.create({
        transactionId: paymentTxId,
        type: 'payment',
        agentId,
        amount: settledAmount,
        paymentMethod: 'cash',
        description: note && String(note).trim()
          ? `Settlement cleared outstanding due. Note: ${String(note).trim()}`
          : 'Settlement cleared outstanding due',
        status: 'completed',
        createdBy: auth.userId,
        updatedBy: auth.userId,
        metadata: {
          paymentNumber: paymentTxId,
          source: 'settlement',
          outstandingDueBefore: settledAmount,
          outstandingDueAfter: 0,
        },
      })
    }
  }

  return NextResponse.json({
    message: 'Settlement completed',
    settledReceipts,
    settledAmount,
  })
}
