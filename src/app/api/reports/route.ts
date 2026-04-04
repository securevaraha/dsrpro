import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import MerchantSettlement from '@/models/MerchantSettlement'
import User from '@/models/User'
import Client from '@/models/Client'
import { requireAuth, isErrorResponse } from '@/lib/auth'

// ─── Single source of truth for all financial calculations ───────────────────
// amount=100, bankCharges=5%, VAT=5%, margin=10%
//   bankChargesAmount = 100 × 5%  = 5.00
//   vatAmount         = 100 × 5%  = 5.00  ← VAT on FULL amount
//   marginAmount      = 100 × 10% = 10.00
//   netReceived       = 100 - 5 - 5        = 90.00  (admin receives from bank after deductions)
//   toPayAmount       = 100 - 5 - 5 - 10   = 80.00  (admin pays agent after ALL charges)
//   finalMargin       = 10 - 5 - 5         = 0.00   (admin's actual profit)
function calcFinancials(amount: number, pos: any) {
  const marginPercent      = pos?.commissionPercentage || 0
  const bankChargesPercent = pos?.bankCharges          || 0
  const vatPercent         = pos?.vatPercentage        || 0

  const marginAmount      = (amount * marginPercent)      / 100
  const bankChargesAmount = (amount * bankChargesPercent) / 100
  const vatAmount         = (amount * vatPercent)         / 100   // VAT on full amount

  const netReceived  = amount - bankChargesAmount - vatAmount              // admin receives from bank
  const toPayAmount  = amount - bankChargesAmount - vatAmount - marginAmount  // admin pays agent
  const finalMargin  = marginAmount - bankChargesAmount - vatAmount

  return { marginPercent, marginAmount, bankChargesPercent, bankChargesAmount, vatPercent, vatAmount, toPayAmount, netReceived, finalMargin }
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
  let query: any = { ...dateFilter, type: 'payment' }
  if (auth.role === 'agent') query.agentId = auth.userId
  else if (agentId) query.agentId = agentId

  const total = await Transaction.countDocuments(query)
  const allPayments = await Transaction.find(query).populate('agentId', 'name email').sort({ createdAt: -1 })
  const payments    = await Transaction.find(query).populate('agentId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit)
  const totalAmount = allPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

  const mapItem = (p: any) => ({
    transactionId: p.transactionId, date: p.date || p.createdAt,
    agentId: p.agentId?._id?.toString() || '', agent: p.agentId?.name || 'N/A',
    paymentMethod: p.paymentMethod, amount: p.amount, status: p.status, description: p.description,
  })

  return NextResponse.json({
    reportType: 'payments', totalAmount, totalPayments: payments.length,
    total, page, limit, totalPages: Math.ceil(total / limit),
    items: payments.map(mapItem), allItems: allPayments.map(mapItem),
  })
}

// ─── Settlement Report ────────────────────────────────────────────────────────
async function generateSettlementReport(dateFilter: any, auth: any, page = 1, limit = 50, skip = 0) {
  if (auth.role === 'agent') {
    const query: any = { ...dateFilter, type: 'payment', status: { $in: ['pending', 'failed', 'due'] }, agentId: auth.userId }
    const total = await Transaction.countDocuments(query)
    const allT  = await Transaction.find(query).populate('agentId', 'name email').populate('createdBy', 'name').populate('updatedBy', 'name').sort({ createdAt: -1 })
    const pageT = await Transaction.find(query).populate('agentId', 'name email').populate('createdBy', 'name').populate('updatedBy', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit)
    const mapItem = (t: any) => ({ batchId: t.metadata?.paymentNumber || t.transactionId, transactionId: t.transactionId, type: 'settlement', date: t.date || t.createdAt, createdAt: t.createdAt, updatedAt: t.updatedAt, agentId: t.agentId?._id?.toString() || '', agent: t.agentId?.name || 'N/A', posMachine: 'No POS', amount: Number(t.amount || 0), netReceived: Number(t.amount || 0), status: t.status, description: t.description || 'Settlement follow-up payment', createdBy: t.createdBy?.name || 'System', updatedBy: t.updatedBy?.name || 'System', createdDate: t.createdAt, updatedDate: t.updatedAt })
    const allItems = allT.map(mapItem)
    return NextResponse.json({ reportType: 'settlements', totalRevenue: allItems.reduce((s: number, i: any) => s + i.amount, 0), totalTransactions: allItems.length, totalBankCharges: 0, totalVAT: 0, totalMargin: 0, total, page, limit, totalPages: Math.ceil(total / limit), items: pageT.map(mapItem), allItems })
  }

  if (auth.role !== 'admin') return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const settlementsTotal = await MerchantSettlement.countDocuments(dateFilter)
  if (settlementsTotal === 0) return NextResponse.json({ reportType: 'settlements', totalCCSales: 0, totalCharges: 0, totalMargin: 0, totalPaid: 0, totalBalance: 0, totalSettlements: 0, totalBankCharges: 0, totalVAT: 0, totalRevenue: 0, totalTransactions: 0, total: 0, page, limit, totalPages: 0, items: [], allItems: [] })

  const POSMachine = require('@/models/POSMachine').default
  const posMachines = await POSMachine.find({ status: 'active' }).populate('assignedAgent', 'name')
  const settlements = await MerchantSettlement.find(dateFilter).populate('merchantId', 'name email').populate('createdBy', 'name').populate('updatedBy', 'name').sort({ date: -1 }).skip(skip).limit(limit)

  const items = settlements.map((item: any) => {
    const pos = posMachines[Math.floor(Math.random() * posMachines.length)] || { segment: 'Default', brand: 'POS', assignedAgent: { name: 'System' }, bankCharges: 2.7, vatPercentage: 5, commissionPercentage: 3.75 }
    const posReceiptAmount = item.ccSales || 1000
    const f = calcFinancials(posReceiptAmount, { commissionPercentage: item.chargesPercent || pos.commissionPercentage || 3.75, bankCharges: pos.bankCharges || 2.7, vatPercentage: pos.vatPercentage || 5 })
    const paid = item.paid || 0
    return { batchId: item._id.toString().slice(-7).toUpperCase(), date: item.date || item.createdAt, agent: item.merchantId?.name || pos.assignedAgent?.name || 'System Agent', posMachine: `${pos.segment} / ${pos.brand}`, posReceiptAmount, amount: posReceiptAmount, ...f, margin: f.finalMargin, paid, balance: f.toPayAmount - paid, createdBy: item.createdBy?.name || 'System', updatedBy: item.updatedBy?.name || 'System', createdDate: item.createdAt, updatedDate: item.updatedAt, description: item.description || '', status: item.status || 'completed' }
  })

  return NextResponse.json({ reportType: 'settlements', totalCCSales: settlements.reduce((s: number, i: any) => s + (i.ccSales || 0), 0), totalMargin: settlements.reduce((s: number, i: any) => s + (i.margin || 0), 0), totalPaid: settlements.reduce((s: number, i: any) => s + (i.paid || 0), 0), totalBalance: settlements.reduce((s: number, i: any) => s + (i.balance || 0), 0), totalSettlements: settlements.length, totalBankCharges: 0, totalVAT: 0, totalRevenue: settlements.reduce((s: number, i: any) => s + (i.ccSales || 0), 0), totalTransactions: settlements.length, total: settlementsTotal, page, limit, totalPages: Math.ceil(settlementsTotal / limit), items, allItems: items })
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
