import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import MerchantSettlement from '@/models/MerchantSettlement'
import User from '@/models/User'
import Client from '@/models/Client'
import { requireAuth, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'transactions'
    const range = searchParams.get('range') || 'month'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const agentId = searchParams.get('agentId')
    
    let dateFilter: any = {}
    const now = new Date()
    
    switch (range) {
      case 'today':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          }
        }
        break
      case 'week':
        const weekStart = new Date(now.getTime())
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        weekStart.setHours(0, 0, 0, 0)
        dateFilter = { createdAt: { $gte: weekStart } }
        break
      case 'month':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
          }
        }
        break
      case 'year':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lt: new Date(now.getFullYear() + 1, 0, 1)
          }
        }
        break
      case 'custom':
        if (startDate && endDate) {
          const parsedStart = new Date(startDate)
          const parsedEnd = new Date(endDate)
          if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
          }
          dateFilter = {
            createdAt: {
              $gte: parsedStart,
              $lte: parsedEnd
            }
          }
        }
        break
    }
    
    // Generate different reports based on type
    switch (type) {
      case 'transactions':
        return await generateTransactionReport(dateFilter, auth, agentId)
      case 'receipts':
        return await generateReceiptReport(dateFilter, auth, agentId)
      case 'payments':
        return await generatePaymentReport(dateFilter, auth, agentId)
      case 'settlements':
        return await generateSettlementReport(dateFilter, auth)
      case 'agents':
        return await generateAgentReport(dateFilter, auth)
      case 'clients':
        return await generateClientReport(dateFilter, auth)
      case 'commission':
        return await generateCommissionReport(dateFilter, auth, agentId)
      case 'summary':
        return await generateSummaryReport(dateFilter, auth)
      default:
        return await generateTransactionReport(dateFilter, auth, agentId)
    }
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

// Transaction Report
async function generateTransactionReport(dateFilter: any, auth: any, agentId?: string | null) {
  let query: any = { ...dateFilter }
  
  if (auth.role === 'agent') {
    query.agentId = auth.userId
  } else if (agentId) {
    query.agentId = agentId
  }
  
  const transactions = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('clientId', 'name businessType')
    .sort({ createdAt: -1 })
    .limit(500)
  
  const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
  const totalCommission = transactions.reduce((sum: number, t: any) => sum + (t.commission || 0), 0)
  const averageTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0
  
  // Group by payment method
  const paymentMethodBreakdown = transactions.reduce((acc: any, t: any) => {
    acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.amount
    return acc
  }, {})
  
  // Group by status
  const statusBreakdown = transactions.reduce((acc: any, t: any) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})
  
  const items = transactions.map((t: any) => ({
    transactionId: t.transactionId,
    date: t.createdAt,
    agent: t.agentId?.name || 'N/A',
    client: t.clientId?.name || 'N/A',
    type: t.type,
    paymentMethod: t.paymentMethod,
    amount: t.amount,
    commission: t.commission || 0,
    status: t.status,
    description: t.description || `Transaction ${t.transactionId}`
  }))
  
  return NextResponse.json({
    reportType: 'transactions',
    totalRevenue,
    totalTransactions: transactions.length,
    totalCommission,
    averageTransaction,
    paymentMethodBreakdown,
    statusBreakdown,
    items
  })
}

// Receipt Report
async function generateReceiptReport(dateFilter: any, auth: any, agentId?: string | null) {
  let query: any = { ...dateFilter, type: 'receipt' }
  
  if (auth.role === 'agent') {
    query.agentId = auth.userId
  } else if (agentId) {
    query.agentId = agentId
  }
  
  const receipts = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('posMachine', 'segment brand terminalId bankCharges vatPercentage commissionPercentage')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(500)
  
  const totalAmount = receipts.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)

  // Collect unique segments and brands for filters
  const segments = Array.from(new Set(receipts.map((r: any) => r.posMachine?.segment).filter(Boolean))) as string[]
  const brands = Array.from(new Set(receipts.map((r: any) => r.posMachine?.brand).filter(Boolean))) as string[]
  
  const items = receipts.map((r: any) => ({
    receiptNumber: r.metadata?.receiptNumber || r.transactionId,
    date: r.createdAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    agent: r.agentId?.name || 'N/A',
    createdBy: r.createdBy?.name || null,
    updatedBy: r.updatedBy?.name || null,
    posMachineSegment: r.posMachine?.segment || null,
    posMachineBrand: r.posMachine?.brand || null,
    posMachineTerminalId: r.posMachine?.terminalId || null,
    bankCharges: r.posMachine?.bankCharges ?? null,
    vatPercentage: r.posMachine?.vatPercentage ?? null,
    commissionPercentage: r.posMachine?.commissionPercentage ?? null,
    paymentMethod: r.paymentMethod,
    amount: r.amount,
    description: r.description,
    attachments: r.attachments?.length || 0
  }))
  
  return NextResponse.json({
    reportType: 'receipts',
    totalAmount,
    totalRevenue: totalAmount,
    totalTransactions: receipts.length,
    totalReceipts: receipts.length,
    segments,
    brands,
    items
  })
}

// Payment Report
async function generatePaymentReport(dateFilter: any, auth: any, agentId?: string | null) {
  let query: any = { ...dateFilter, type: 'payment' }
  
  if (auth.role === 'agent') {
    query.agentId = auth.userId
  } else if (agentId) {
    query.agentId = agentId
  }
  
  const payments = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('clientId', 'name businessType')
    .sort({ createdAt: -1 })
    .limit(500)
  
  const totalAmount = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
  
  const items = payments.map((p: any) => ({
    transactionId: p.transactionId,
    date: p.createdAt,
    agent: p.agentId?.name || 'N/A',
    client: p.clientId?.name || 'N/A',
    paymentMethod: p.paymentMethod,
    amount: p.amount,
    status: p.status,
    description: p.description
  }))
  
  return NextResponse.json({
    reportType: 'payments',
    totalAmount,
    totalPayments: payments.length,
    items
  })
}

// Settlement Report with detailed calculations
async function generateSettlementReport(dateFilter: any, auth: any) {
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  
  const settlements = await MerchantSettlement.find(dateFilter)
    .populate('merchantId', 'name email')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ date: -1 })
    .limit(500)
  
  const totalCCSales = settlements.reduce((sum: number, s: any) => sum + (s.ccSales || 0), 0)
  const totalCharges = settlements.reduce((sum: number, s: any) => sum + (s.charges || 0), 0)
  const totalMargin = settlements.reduce((sum: number, s: any) => sum + (s.margin || 0), 0)
  const totalPaid = settlements.reduce((sum: number, s: any) => sum + (s.paid || 0), 0)
  const totalBalance = settlements.reduce((sum: number, s: any) => sum + (s.balance || 0), 0)
  
  const items = settlements.map((s: any) => {
    // Dynamic calculations
    const posReceiptAmount = s.ccSales || 0
    const marginPercent = s.chargesPercent || 3.75
    const marginAmount = (posReceiptAmount * marginPercent) / 100
    const bankChargesPercent = 2.7 // Standard bank charges
    const bankChargesAmount = (posReceiptAmount * bankChargesPercent) / 100
    const vatPercent = 5 // UAE VAT
    const vatAmount = (marginAmount * vatPercent) / 100
    const netReceived = posReceiptAmount - (marginAmount + bankChargesAmount + vatAmount)
    const toPayAmount = posReceiptAmount - marginAmount - bankChargesAmount
    const finalMargin = marginAmount - bankChargesAmount - vatAmount
    const balance = toPayAmount - (s.paid || 0)
    
    return {
      batchId: s._id.toString().slice(-8).toUpperCase(),
      date: s.date,
      agent: s.merchantId?.name || 'N/A',
      posMachine: 'Edutech / Geodia', // Default or from POS data
      posReceiptAmount: posReceiptAmount,
      marginPercent: marginPercent,
      marginAmount: marginAmount,
      bankChargesPercent: bankChargesPercent,
      bankChargesAmount: bankChargesAmount,
      vatPercent: vatPercent,
      vatAmount: vatAmount,
      netReceived: netReceived,
      toPayAmount: toPayAmount,
      margin: finalMargin,
      paid: s.paid || 0,
      balance: balance,
      createdBy: s.createdBy?.name || 'System',
      updatedBy: s.updatedBy?.name || 'System',
      createdDate: s.createdAt,
      updatedDate: s.updatedAt,
      description: s.description || '',
      status: s.status
    }
  })
  
  return NextResponse.json({
    reportType: 'settlements',
    totalCCSales,
    totalCharges,
    totalMargin,
    totalPaid,
    totalBalance,
    totalSettlements: settlements.length,
    items
  })
}

// Agent Performance Report
async function generateAgentReport(dateFilter: any, auth: any) {
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  
  const agents = await User.find({ role: 'agent' })
  const agentPerformance = []
  
  for (const agent of agents) {
    const transactions = await Transaction.find({
      ...dateFilter,
      agentId: agent._id
    })
    
    const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
    const totalCommission = transactions.reduce((sum: number, t: any) => sum + (t.commission || 0), 0)
    
    agentPerformance.push({
      agentId: agent._id,
      name: agent.name,
      email: agent.email,
      totalTransactions: transactions.length,
      totalRevenue,
      totalCommission,
      averageTransaction: transactions.length > 0 ? totalRevenue / transactions.length : 0
    })
  }
  
  // Sort by total revenue
  agentPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue)
  
  return NextResponse.json({
    reportType: 'agents',
    totalAgents: agents.length,
    items: agentPerformance
  })
}

// Client Report
async function generateClientReport(dateFilter: any, auth: any) {
  let clientQuery: any = {}
  
  if (auth.role === 'agent') {
    clientQuery.assignedAgent = auth.userId
  }
  
  const clients = await Client.find(clientQuery).populate('assignedAgent', 'name')
  const clientPerformance = []
  
  for (const client of clients) {
    const transactions = await Transaction.find({
      ...dateFilter,
      clientId: client._id
    })
    
    const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
    const totalCommission = transactions.reduce((sum: number, t: any) => sum + (t.commission || 0), 0)
    
    clientPerformance.push({
      clientId: client._id,
      name: client.name,
      businessType: client.businessType,
      assignedAgent: client.assignedAgent?.name || 'N/A',
      commissionRate: client.commissionRate,
      totalTransactions: transactions.length,
      totalRevenue,
      totalCommission,
      status: client.status
    })
  }
  
  // Sort by total revenue
  clientPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue)
  
  return NextResponse.json({
    reportType: 'clients',
    totalClients: clients.length,
    items: clientPerformance
  })
}

// Commission Report
async function generateCommissionReport(dateFilter: any, auth: any, agentId?: string | null) {
  let query: any = { ...dateFilter, commission: { $gt: 0 } }
  
  if (auth.role === 'agent') {
    query.agentId = auth.userId
  } else if (agentId) {
    query.agentId = agentId
  }
  
  const transactions = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('clientId', 'name commissionRate')
    .sort({ createdAt: -1 })
    .limit(500)
  
  const totalCommission = transactions.reduce((sum: number, t: any) => sum + (t.commission || 0), 0)
  const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
  
  const items = transactions.map((t: any) => ({
    transactionId: t.transactionId,
    date: t.createdAt,
    agent: t.agentId?.name || 'N/A',
    client: t.clientId?.name || 'N/A',
    commissionRate: t.clientId?.commissionRate || 0,
    transactionAmount: t.amount,
    commission: t.commission,
    status: t.status
  }))
  
  return NextResponse.json({
    reportType: 'commission',
    totalCommission,
    totalRevenue,
    commissionPercentage: totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0,
    totalTransactions: transactions.length,
    items
  })
}

// Summary Report
async function generateSummaryReport(dateFilter: any, auth: any) {
  let query: any = { ...dateFilter }
  
  if (auth.role === 'agent') {
    query.agentId = auth.userId
  }
  
  const transactions = await Transaction.find(query)
  const receipts = await Transaction.find({ ...query, type: 'receipt' })
  const payments = await Transaction.find({ ...query, type: 'payment' })
  
  const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
  const totalCommission = transactions.reduce((sum: number, t: any) => sum + (t.commission || 0), 0)
  const totalReceipts = receipts.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
  const totalPayments = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
  
  return NextResponse.json({
    reportType: 'summary',
    totalTransactions: transactions.length,
    totalRevenue,
    totalCommission,
    totalReceipts: {
      count: receipts.length,
      amount: totalReceipts
    },
    totalPayments: {
      count: payments.length,
      amount: totalPayments
    },
    averageTransaction: transactions.length > 0 ? totalRevenue / transactions.length : 0
  })
}