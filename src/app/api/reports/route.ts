import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import MerchantSettlement from '@/models/MerchantSettlement'
import User from '@/models/User'
import Client from '@/models/Client'
import '@/models/POSMachine'
import { requireAuth, isErrorResponse } from '@/lib/auth'

// ─── Single source of truth for all financial calculations ───────────────────
// amount=100, charges=3.75%, bankCharges=2.7%, VAT=5%
//   chargesAmount     = 100 × 3.75% = 3.75
//   bankChargesAmount = 100 × 2.7%  = 2.70
//   vatAmount         = 2.70 × 5%   = 0.135  ← VAT on BANK CHARGES amount
//   netReceived       = 100 - 2.70 - 0.135 = 97.165
//   toPayAmount       = 100 - 3.75         = 96.25
//   marginAmount      = 97.165 - 96.25     = 0.915   (admin's earning)
function calcFinancials(amount: number, pos: any) {
  const chargesPercent     = pos?.commissionPercentage || 0
  const bankChargesPercent = pos?.bankCharges          || 0
  const vatPercent         = pos?.vatPercentage        || 0

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

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { searchParams } = new URL(request.url)
    const type      = searchParams.get('type')      || 'summary'
    const range     = searchParams.get('range')     || 'month'
    const startDate = searchParams.get('startDate')
    const endDate   = searchParams.get('endDate')
    const agentId   = searchParams.get('agentId')
    const page      = parseInt(searchParams.get('page')  || '1')
    const limit     = parseInt(searchParams.get('limit') || '50')
    const skip      = (page - 1) * limit

    let dateFilter: any = {}
    const now = new Date()

    switch (range) {
      case 'today':
        dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) } }
        break
      case 'week':
        const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0,0,0,0)
        dateFilter = { createdAt: { $gte: weekStart } }
        break
      case 'month':
        dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1), $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) } }
        break
      case 'year':
        dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), 0, 1), $lt: new Date(now.getFullYear() + 1, 0, 1) } }
        break
      case 'custom':
        if (startDate && endDate) {
          const s = new Date(startDate), e = new Date(endDate)
          if (isNaN(s.getTime()) || isNaN(e.getTime())) return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
          dateFilter = { createdAt: { $gte: s, $lte: e } }
        }
        break
    }

    switch (type) {
      case 'receipts':    return await generateReceiptReport(dateFilter, auth, agentId, page, limit, skip)
      case 'payments':    return await generatePaymentReport(dateFilter, auth, agentId, page, limit, skip)
      case 'settlements': return await generateSettlementReport(dateFilter, auth, page, limit, skip)
      default:            return await generateSummaryReport(dateFilter, auth, page, limit, skip)
    }
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

// ─── Receipt Report ───────────────────────────────────────────────────────────
async function generateReceiptReport(dateFilter: any, auth: any, agentId?: string | null, page = 1, limit = 50, skip = 0) {
  let query: any = { ...dateFilter, type: 'receipt' }
  if (auth.role === 'agent') query.agentId = auth.userId
  else if (agentId) query.agentId = agentId

  const total = await Transaction.countDocuments(query)
  const allReceipts = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('posMachine', 'segment brand terminalId bankCharges vatPercentage commissionPercentage')
    .populate('createdBy', 'name').populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
  const receipts = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('posMachine', 'segment brand terminalId bankCharges vatPercentage commissionPercentage')
    .populate('createdBy', 'name').populate('updatedBy', 'name')
    .sort({ createdAt: -1 }).skip(skip).limit(limit)

  let totalBankCharges = 0, totalMargin = 0, totalVAT = 0
  const totalAmount = allReceipts.reduce((sum: number, r: any) => {
    const f = calcFinancials(r.amount || 0, r.posMachine)
    totalBankCharges += f.bankChargesAmount
    totalMargin      += f.marginAmount
    totalVAT         += f.vatAmount
    return sum + (r.amount || 0)
  }, 0)

  const mapItem = (r: any) => {
    const amount = r.amount || 0
    const f = calcFinancials(amount, r.posMachine)
    const paidAmount = Math.min(r.paidAmount || 0, f.toPayAmount)
    const settlementAmount = Math.min(r.settlementAmount || 0, Math.max(0, f.toPayAmount - paidAmount))
    const dueAmount  = Math.max(0, f.toPayAmount - paidAmount - settlementAmount)
    return {
      receiptNumber: r.metadata?.receiptNumber || r.transactionId,
      transactionId: r.transactionId,
      date: r.createdAt, createdAt: r.createdAt, updatedAt: r.updatedAt,
      agentId: r.agentId?._id?.toString() || '',
      agent: r.agentId?.name || 'N/A',
      posMachineId: r.posMachine?._id?.toString() || '',
      createdBy: r.createdBy?.name || null, updatedBy: r.updatedBy?.name || null,
      posMachineSegment: r.posMachine?.segment || null,
      posMachineBrand: r.posMachine?.brand || null,
      posMachineTerminalId: r.posMachine?.terminalId || null,
      bankCharges: r.posMachine?.bankCharges ?? null,
      vatPercentage: r.posMachine?.vatPercentage ?? null,
      commissionPercentage: r.posMachine?.commissionPercentage ?? null,
      paymentMethod: r.paymentMethod, amount,
      ...f, paidAmount, settlementAmount, dueAmount,
      description: r.description, status: r.status,
      attachments: r.attachments?.length || 0,
    }
  }

  const segments = Array.from(new Set(allReceipts.map((r: any) => r.posMachine?.segment).filter(Boolean))) as string[]
  const brands   = Array.from(new Set(allReceipts.map((r: any) => r.posMachine?.brand).filter(Boolean))) as string[]

  return NextResponse.json({
    reportType: 'receipts', totalAmount, totalRevenue: totalAmount,
    totalTransactions: allReceipts.length, totalReceipts: allReceipts.length,
    totalBankCharges, totalMargin, totalVAT, segments, brands,
    total, page, limit, totalPages: Math.ceil(total / limit),
    items: receipts.map(mapItem), allItems: allReceipts.map(mapItem),
  })
}

// ─── Payment Report ───────────────────────────────────────────────────────────
async function generatePaymentReport(dateFilter: any, auth: any, agentId?: string | null, page = 1, limit = 50, skip = 0) {
  let query: any = { ...dateFilter, type: 'payment', 'metadata.source': { $ne: 'settlement' } }
  if (auth.role === 'agent') query.agentId = auth.userId
  else if (agentId) query.agentId = agentId

  const total = await Transaction.countDocuments(query)
  const allPayments = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
  const payments    = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
  const totalAmount = allPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

  const mapItem = (p: any) => ({
    transactionId: p.transactionId, date: p.date || p.createdAt,
    agentId: p.agentId?._id?.toString() || '', agent: p.agentId?.name || 'N/A',
    paymentMethod: p.paymentMethod, amount: p.amount, status: p.status, description: p.description,
    source: String(p.metadata?.source || 'manual-payment').toLowerCase(),
    createdBy: p.createdBy?.name || 'System',
    updatedBy: p.updatedBy?.name || 'System',
    createdDate: p.createdAt,
    updatedDate: p.updatedAt,
  })

  return NextResponse.json({
    reportType: 'payments', totalAmount, totalPayments: payments.length,
    total, page, limit, totalPages: Math.ceil(total / limit),
    items: payments.map(mapItem), allItems: allPayments.map(mapItem),
  })
}

// ─── Settlement Report ────────────────────────────────────────────────────────
async function generateSettlementReport(dateFilter: any, auth: any, page = 1, limit = 50, skip = 0) {
  if (auth.role !== 'admin' && auth.role !== 'agent') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const query: any = {
    ...dateFilter,
    type: 'payment',
    status: 'completed',
    'metadata.source': 'settlement',
  }
  if (auth.role === 'agent') query.agentId = auth.userId

  const total = await Transaction.countDocuments(query)
  const allSettlements = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
  const pagedSettlements = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const mapItem = (t: any) => ({
    batchId: t.metadata?.paymentNumber || t.transactionId,
    transactionId: t.transactionId,
    type: 'settlement',
    date: t.date || t.createdAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    agentId: t.agentId?._id?.toString() || '',
    agent: t.agentId?.name || 'N/A',
    posMachine: 'Settlement',
    amount: Number(t.amount || 0),
    netReceived: Number(t.amount || 0),
    status: t.status || 'completed',
    description: t.description || 'Settlement payment',
    paymentMethod: t.paymentMethod || 'cash',
    source: 'settlement',
    createdBy: t.createdBy?.name || 'System',
    updatedBy: t.updatedBy?.name || 'System',
    createdDate: t.createdAt,
    updatedDate: t.updatedAt,
  })

  const allItems = allSettlements.map(mapItem)
  return NextResponse.json({
    reportType: 'settlements',
    totalRevenue: allItems.reduce((s: number, i: any) => s + i.amount, 0),
    totalTransactions: allItems.length,
    totalBankCharges: 0,
    totalVAT: 0,
    totalMargin: 0,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items: pagedSettlements.map(mapItem),
    allItems,
  })
}

// ─── Summary Report ───────────────────────────────────────────────────────────
async function generateSummaryReport(dateFilter: any, auth: any, page = 1, limit = 50, skip = 0) {
  let query: any = { ...dateFilter, type: 'receipt' }
  if (auth.role === 'agent') query.agentId = auth.userId

  const total = await Transaction.countDocuments(query)
  const allTransactions = await Transaction.find(query)
    .populate('agentId', 'name email').populate('clientId', 'name businessType')
    .populate('posMachine', 'segment brand terminalId bankCharges vatPercentage commissionPercentage')
    .populate('createdBy', 'name').populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
  const transactions = await Transaction.find(query)
    .populate('agentId', 'name email').populate('clientId', 'name businessType')
    .populate('posMachine', 'segment brand terminalId bankCharges vatPercentage commissionPercentage')
    .populate('createdBy', 'name').populate('updatedBy', 'name')
    .sort({ createdAt: -1 }).skip(skip).limit(limit)

  const payments = await Transaction.find({ ...dateFilter, ...(auth.role === 'agent' ? { agentId: auth.userId } : {}), type: 'payment' })

  let totalBankCharges = 0, totalMargin = 0, totalVAT = 0
  const totalRevenue = allTransactions.reduce((sum: number, t: any) => {
    const f = calcFinancials(t.amount || 0, t.posMachine)
    totalBankCharges += f.bankChargesAmount
    totalMargin      += f.marginAmount
    totalVAT         += f.vatAmount
    return sum + (t.amount || 0)
  }, 0)

  const mapItem = (t: any) => {
    const posAmount = t.amount || 0
    const pos = t.posMachine || {}
    const f = calcFinancials(posAmount, pos)
    const paidAmount = Math.min(t.paidAmount || 0, f.toPayAmount)
    const settlementAmount = Math.min(t.settlementAmount || 0, Math.max(0, f.toPayAmount - paidAmount))
    const dueAmount = Math.max(0, f.toPayAmount - paidAmount - settlementAmount)
    return {
      _id: t._id,
      transactionId: t.transactionId,
      receiptNumber: t.metadata?.receiptNumber || t.transactionId,
      batchId: t.metadata?.receiptNumber || t.transactionId,
      date: t.createdAt,
      agent: t.agentId?.name || 'System Agent',
      client: t.clientId?.name || 'N/A',
      type: t.type || 'transaction',
      paymentMethod: t.paymentMethod,
      amount: posAmount,
      commission: t.commission || 0,
      status: t.status || 'completed',
      description: t.description || '',
      posMachine: pos.segment && pos.brand ? `${pos.segment}/${pos.brand}` : 'No POS',
      posMachineTerminalId: pos.terminalId || 'N/A',
      ...f,
      paid: paidAmount,
      settlementAmount,
      dueAmount,
      balance: dueAmount,
      createdBy: t.createdBy?.name || 'System',
      updatedBy: t.updatedBy?.name || 'System',
      createdDate: t.createdAt,
      updatedDate: t.updatedAt,
      attachments: t.attachments || [],
    }
  }

  return NextResponse.json({
    reportType: 'summary',
    totalTransactions: allTransactions.length,
    totalRevenue, totalBankCharges, totalMargin, totalVAT,
    totalCommission: allTransactions.reduce((s: number, t: any) => s + (t.commission || 0), 0),
    averageTransaction: allTransactions.length > 0 ? totalRevenue / allTransactions.length : 0,
    totalReceipts: { count: allTransactions.length, amount: allTransactions.reduce((s: number, r: any) => s + (r.amount || 0), 0) },
    totalPayments: { count: payments.length, amount: payments.reduce((s: number, p: any) => s + (p.amount || 0), 0) },
    total, page, limit, totalPages: Math.ceil(total / limit),
    items: transactions.map(mapItem),
    allItems: allTransactions.map(mapItem),
  })
}
