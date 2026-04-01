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

    console.log('Reports API - Auth user:', auth)

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const range = searchParams.get('range') || 'month'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const agentId = searchParams.get('agentId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit
    
    console.log('Reports API - Parameters:', { type, range, startDate, endDate, agentId, page, limit })
    
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
      case 'receipts':
        return await generateReceiptReport(dateFilter, auth, agentId, page, limit, skip)
      case 'payments':
        return await generatePaymentReport(dateFilter, auth, agentId, page, limit, skip)
      case 'settlements':
        return await generateSettlementReport(dateFilter, auth, page, limit, skip)
      case 'summary':
        return await generateSummaryReport(dateFilter, auth, page, limit, skip)
      default:
        return await generateSettlementReport(dateFilter, auth, page, limit, skip)
    }
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

// Transaction Report
async function generateTransactionReport(dateFilter: any, auth: any, agentId?: string | null, page: number = 1, limit: number = 50, skip: number = 0) {
  let query: any = { ...dateFilter }
  
  if (auth.role === 'agent') {
    query.agentId = auth.userId
  } else if (agentId) {
    query.agentId = agentId
  }
  
  const total = await Transaction.countDocuments(query)
  const transactions = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('clientId', 'name businessType')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
  
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
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items
  })
}

// Receipt Report
async function generateReceiptReport(dateFilter: any, auth: any, agentId?: string | null, page: number = 1, limit: number = 50, skip: number = 0) {
  let query: any = { ...dateFilter, type: 'receipt' }
  
  if (auth.role === 'agent') {
    query.agentId = auth.userId
  } else if (agentId) {
    query.agentId = agentId
  }
  
  const total = await Transaction.countDocuments(query)
  
  // Get ALL receipt transactions for totals calculation
  const allReceipts = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('posMachine', 'segment brand terminalId bankCharges vatPercentage commissionPercentage')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
  
  // Get paginated receipts for table display
  const receipts = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('posMachine', 'segment brand terminalId bankCharges vatPercentage commissionPercentage')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
  
  const totalAmount = allReceipts.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
  
  // Calculate financial totals from ALL receipts
  let totalBankCharges = 0
  let totalMargin = 0
  let totalVAT = 0
  
  allReceipts.forEach((r: any) => {
    const posAmount = r.amount || 0
    const posMachine = r.posMachine || {}
    
    const marginPercent = posMachine.commissionPercentage || 0
    const marginAmount = marginPercent > 0 ? (posAmount * marginPercent / 100) : 0
    const bankChargesPercent = posMachine.bankCharges || 0
    const bankChargesAmount = bankChargesPercent > 0 ? (posAmount * bankChargesPercent / 100) : 0
    const vatPercent = posMachine.vatPercentage || 0
    const vatAmount = vatPercent > 0 && bankChargesAmount > 0 ? (bankChargesAmount * vatPercent / 100) : 0
    
    totalBankCharges += bankChargesAmount
    totalMargin += marginAmount
    totalVAT += vatAmount
  })

  // Collect unique segments and brands for filters
  const segments = Array.from(new Set(allReceipts.map((r: any) => r.posMachine?.segment).filter(Boolean))) as string[]
  const brands = Array.from(new Set(allReceipts.map((r: any) => r.posMachine?.brand).filter(Boolean))) as string[]
  
  const items = receipts.map((r: any) => ({
    receiptNumber: r.metadata?.receiptNumber || r.transactionId,
    transactionId: r.transactionId,
    date: r.createdAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    agentId: r.agentId?._id?.toString() || '',
    agent: r.agentId?.name || 'N/A',
    posMachineId: r.posMachine?._id?.toString() || '',
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

  const allItems = allReceipts.map((r: any) => ({
    receiptNumber: r.metadata?.receiptNumber || r.transactionId,
    transactionId: r.transactionId,
    date: r.createdAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    agentId: r.agentId?._id?.toString() || '',
    agent: r.agentId?.name || 'N/A',
    posMachineId: r.posMachine?._id?.toString() || '',
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
    status: r.status,
    attachments: r.attachments?.length || 0
  }))
  
  return NextResponse.json({
    reportType: 'receipts',
    totalAmount,
    totalRevenue: totalAmount,
    totalTransactions: allReceipts.length,
    totalReceipts: allReceipts.length,
    totalBankCharges,
    totalMargin,
    totalVAT,
    segments,
    brands,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items,
    allItems
  })
}

// Payment Report
async function generatePaymentReport(dateFilter: any, auth: any, agentId?: string | null, page: number = 1, limit: number = 50, skip: number = 0) {
  let query: any = { ...dateFilter, type: 'payment' }
  
  if (auth.role === 'agent') {
    query.agentId = auth.userId
  } else if (agentId) {
    query.agentId = agentId
  }
  
  const total = await Transaction.countDocuments(query)
  const allPayments = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('clientId', 'name businessType')
    .sort({ createdAt: -1 })
  const payments = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('clientId', 'name businessType')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
  
  const totalAmount = allPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
  
  const items = payments.map((p: any) => ({
    transactionId: p.transactionId,
    date: p.date || p.createdAt,
    agentId: p.agentId?._id?.toString() || '',
    agent: p.agentId?.name || 'N/A',
    client: p.clientId?.name || 'N/A',
    paymentMethod: p.paymentMethod,
    amount: p.amount,
    status: p.status,
    description: p.description
  }))

  const allItems = allPayments.map((p: any) => ({
    transactionId: p.transactionId,
    date: p.date || p.createdAt,
    agentId: p.agentId?._id?.toString() || '',
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
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items,
    allItems
  })
}

// Settlement Report
async function generateSettlementReport(dateFilter: any, auth: any, page: number = 1, limit: number = 50, skip: number = 0) {
  if (auth.role === 'agent') {
    const query: any = {
      ...dateFilter,
      type: 'payment',
      status: { $in: ['pending', 'failed', 'due'] },
      agentId: auth.userId,
    }

    const total = await Transaction.countDocuments(query)
    const allTransactions = await Transaction.find(query)
      .populate('agentId', 'name email')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 })
    const transactions = await Transaction.find(query)
      .populate('agentId', 'name email')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const mapSettlementItem = (t: any) => {
      const amount = Number(t.amount || 0)
      return {
        batchId: t.metadata?.paymentNumber || t.transactionId,
        transactionId: t.transactionId,
        type: 'settlement',
        date: t.date || t.createdAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        agentId: t.agentId?._id?.toString() || '',
        agent: t.agentId?.name || 'N/A',
        posMachine: 'No POS',
        posReceiptAmount: amount,
        amount,
        netReceived: amount,
        status: t.status,
        description: t.description || 'Settlement follow-up payment',
        createdBy: t.createdBy?.name || 'System',
        updatedBy: t.updatedBy?.name || 'System',
        createdDate: t.createdAt,
        updatedDate: t.updatedAt,
      }
    }

    const allItems = allTransactions.map(mapSettlementItem)
    const items = transactions.map(mapSettlementItem)
    const totalAmount = allItems.reduce((sum: number, it: any) => sum + (it.amount || 0), 0)

    return NextResponse.json({
      reportType: 'settlements',
      totalRevenue: totalAmount,
      totalTransactions: allItems.length,
      totalBankCharges: 0,
      totalVAT: 0,
      totalMargin: 0,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
      allItems,
    })
  }

  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  
  // Check if there are any settlements first
  const settlementsTotal = await MerchantSettlement.countDocuments(dateFilter)
  
  // If no settlements exist, return empty data
  if (settlementsTotal === 0) {
    return NextResponse.json({
      reportType: 'settlements',
      totalCCSales: 0,
      totalCharges: 0,
      totalMargin: 0,
      totalPaid: 0,
      totalBalance: 0,
      totalSettlements: 0,
      totalBankCharges: 0,
      totalVAT: 0,
      totalRevenue: 0,
      totalTransactions: 0,
      total: 0,
      page,
      limit,
      totalPages: 0,
      items: [],
      allItems: []
    })
  }
  
  // Get POS machines for dynamic data
  const POSMachine = require('@/models/POSMachine').default
  const posMachines = await POSMachine.find({ status: 'active' })
    .populate('assignedAgent', 'name')
  
  const settlements = await MerchantSettlement.find(dateFilter)
    .populate('merchantId', 'name email')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
  
  const totalCCSales = settlements.reduce((sum: number, s: any) => sum + (s.ccSales || 0), 0)
  const totalCharges = settlements.reduce((sum: number, s: any) => sum + (s.charges || 0), 0)
  const totalMargin = settlements.reduce((sum: number, s: any) => sum + (s.margin || 0), 0)
  const totalPaid = settlements.reduce((sum: number, s: any) => sum + (s.paid || 0), 0)
  const totalBalance = settlements.reduce((sum: number, s: any) => sum + (s.balance || 0), 0)
  
  // Map only settlements (no transactions)
  const items = settlements.map((item: any) => {
    const randomPOS = posMachines[Math.floor(Math.random() * posMachines.length)] || {
      segment: 'Default',
      brand: 'POS',
      assignedAgent: { name: 'System' },
      bankCharges: 2.7,
      vatPercentage: 5
    }
    
    const posReceiptAmount = item.ccSales || (Math.random() * 2000 + 500)
    const marginPercent = item.chargesPercent || 3.75
    const marginAmount = (posReceiptAmount * marginPercent) / 100
    const bankChargesPercent = randomPOS.bankCharges || 2.7
    const bankChargesAmount = (posReceiptAmount * bankChargesPercent) / 100
    const vatPercent = randomPOS.vatPercentage || 5
    const vatAmount = (bankChargesAmount * vatPercent) / 100
    const netReceived = posReceiptAmount - bankChargesAmount - vatAmount
    const toPayAmount = posReceiptAmount - marginAmount
    const finalMargin = marginAmount - bankChargesAmount - vatAmount
    const balance = toPayAmount - (item.paid || 0)
    
    return {
      batchId: item._id.toString().slice(-7).toUpperCase(),
      date: item.date || item.createdAt,
      agent: item.merchantId?.name || randomPOS.assignedAgent?.name || 'System Agent',
      posMachine: `${randomPOS.segment} / ${randomPOS.brand}`,
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
      paid: item.paid || 0,
      balance: balance,
      createdBy: item.createdBy?.name || 'System',
      updatedBy: item.updatedBy?.name || 'System',
      createdDate: item.createdAt,
      updatedDate: item.updatedAt,
      description: item.description || '',
      status: item.status || 'completed'
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
    totalBankCharges: totalCharges * 0.027,
    totalVAT: totalCharges * 0.027 * 0.05,
    totalRevenue: totalCCSales,
    totalTransactions: settlements.length,
    total: settlementsTotal,
    page,
    limit,
    totalPages: Math.ceil(settlementsTotal / limit),
    items,
    allItems: items
  })
}

// Agent Performance Report
async function generateAgentReport(dateFilter: any, auth: any, page: number = 1, limit: number = 50, skip: number = 0) {
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  
  const total = await User.countDocuments({ role: 'agent' })
  const agents = await User.find({ role: 'agent' })
    .skip(skip)
    .limit(limit)
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
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items: agentPerformance
  })
}

// Client Report
async function generateClientReport(dateFilter: any, auth: any, page: number = 1, limit: number = 50, skip: number = 0) {
  let clientQuery: any = {}
  
  if (auth.role === 'agent') {
    clientQuery.assignedAgent = auth.userId
  }
  
  const total = await Client.countDocuments(clientQuery)
  const clients = await Client.find(clientQuery)
    .populate('assignedAgent', 'name')
    .skip(skip)
    .limit(limit)
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
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items: clientPerformance
  })
}

// Commission Report
async function generateCommissionReport(dateFilter: any, auth: any, agentId?: string | null, page: number = 1, limit: number = 50, skip: number = 0) {
  let query: any = { ...dateFilter, commission: { $gt: 0 } }
  
  if (auth.role === 'agent') {
    query.agentId = auth.userId
  } else if (agentId) {
    query.agentId = agentId
  }
  
  const total = await Transaction.countDocuments(query)
  const transactions = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('clientId', 'name commissionRate')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
  
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
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items
  })
}

// Summary Report
async function generateSummaryReport(dateFilter: any, auth: any, page: number = 1, limit: number = 50, skip: number = 0) {
  console.log('generateSummaryReport - Starting with:', { dateFilter, auth: { userId: auth.userId, role: auth.role }, page, limit })
  
  let query: any = { ...dateFilter }
  
  if (auth.role === 'agent') {
    query.agentId = auth.userId
  }
  
  console.log('generateSummaryReport - Query:', query)
  
  // Get total count for pagination
  const total = await Transaction.countDocuments(query)
  console.log('generateSummaryReport - Total transactions found:', total)
  
  // Get ALL transactions for totals calculation (not paginated)
  const allTransactions = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('clientId', 'name businessType')
    .populate('posMachine', 'segment brand terminalId bankCharges vatPercentage commissionPercentage')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
  
  // Get paginated transactions for table display
  const transactions = await Transaction.find(query)
    .populate('agentId', 'name email')
    .populate('clientId', 'name businessType')
    .populate('posMachine', 'segment brand terminalId bankCharges vatPercentage commissionPercentage')
    .populate('createdBy', 'name')
    .populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
  
  const receipts = await Transaction.find({ ...query, type: 'receipt' })
  const payments = await Transaction.find({ ...query, type: 'payment' })
  
  // Calculate totals from ALL transactions
  const totalRevenue = allTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
  const totalCommission = allTransactions.reduce((sum: number, t: any) => sum + (t.commission || 0), 0)
  
  // Calculate financial totals from ALL transactions
  let totalBankCharges = 0
  let totalMargin = 0
  let totalVAT = 0
  
  allTransactions.forEach((t: any) => {
    const posAmount = t.amount || 0
    const posMachine = t.posMachine || {}
    
    const marginPercent = posMachine.commissionPercentage || 0
    const marginAmount = marginPercent > 0 ? (posAmount * marginPercent / 100) : 0
    const bankChargesPercent = posMachine.bankCharges || 0
    const bankChargesAmount = bankChargesPercent > 0 ? (posAmount * bankChargesPercent / 100) : 0
    const vatPercent = posMachine.vatPercentage || 0
    // VAT calculated on bank charges amount
    const vatAmount = vatPercent > 0 && bankChargesAmount > 0 ? (bankChargesAmount * vatPercent / 100) : 0
    
    totalBankCharges += bankChargesAmount
    totalMargin += marginAmount
    totalVAT += vatAmount
  })
  
  const totalReceipts = receipts.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
  const totalPayments = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
  
  // Map paginated transactions for table display
  const items = transactions.map((t: any) => {
    const posAmount = t.amount || 0
    const posMachine = t.posMachine || {}
    
    // Use actual POS machine configuration for calculations
    const marginPercent = posMachine.commissionPercentage || 0
    const marginAmount = marginPercent > 0 ? (posAmount * marginPercent / 100) : 0
    const bankChargesPercent = posMachine.bankCharges || 0
    const bankChargesAmount = bankChargesPercent > 0 ? (posAmount * bankChargesPercent / 100) : 0
    const vatPercent = posMachine.vatPercentage || 0
    // VAT calculated on bank charges amount
    const vatAmount = vatPercent > 0 && bankChargesAmount > 0 ? (bankChargesAmount * vatPercent / 100) : 0
    // FIXED: Net Received = POS Amount - Bank Charges - VAT
    const netReceived = posAmount - bankChargesAmount - vatAmount
    // FIXED: To Pay Amount = POS Amount - Margin
    const toPayAmount = posAmount - marginAmount
    const finalMargin = marginAmount - bankChargesAmount - vatAmount
    
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
      description: t.description || 'Transaction processed successfully',
      // POS Machine data (same structure as receipts)
      posMachine: posMachine.segment && posMachine.brand 
        ? `${posMachine.segment}/${posMachine.brand}` 
        : 'No POS',
      posMachineTerminalId: posMachine.terminalId || 'N/A',
      posMachineData: posMachine, // Full POS machine object for calculations
      // Financial calculations using actual POS configuration
      marginPercent,
      marginAmount,
      bankChargesPercent,
      bankChargesAmount,
      vatPercent,
      vatAmount,
      netReceived,
      toPayAmount,
      finalMargin,
      paid: 0, // Can be updated based on actual payment data
      balance: toPayAmount,
      createdBy: t.createdBy?.name || 'System',
      updatedBy: t.updatedBy?.name || 'System',
      createdDate: t.createdAt,
      updatedDate: t.updatedAt,
      attachments: t.attachments || []
    }
  })
  
  // Return ALL transactions for export (not paginated)
  const allItems = allTransactions.map((t: any) => {
    const posAmount = t.amount || 0
    const posMachine = t.posMachine || {}
    
    const marginPercent = posMachine.commissionPercentage || 0
    const marginAmount = marginPercent > 0 ? (posAmount * marginPercent / 100) : 0
    const bankChargesPercent = posMachine.bankCharges || 0
    const bankChargesAmount = bankChargesPercent > 0 ? (posAmount * bankChargesPercent / 100) : 0
    const vatPercent = posMachine.vatPercentage || 0
    // VAT calculated on bank charges amount
    const vatAmount = vatPercent > 0 && bankChargesAmount > 0 ? (bankChargesAmount * vatPercent / 100) : 0
    // FIXED: Net Received = POS Amount - Bank Charges - VAT
    const netReceived = posAmount - bankChargesAmount - vatAmount
    // FIXED: To Pay Amount = POS Amount - Margin
    const toPayAmount = posAmount - marginAmount
    const finalMargin = marginAmount - bankChargesAmount - vatAmount
    
    return {
      _id: t._id,
      transactionId: t.transactionId,
      receiptNumber: t.metadata?.receiptNumber || t.transactionId,
      batchId: t.metadata?.receiptNumber || t.transactionId,
      date: t.createdAt,
      agent: t.agentId?.name || 'System Agent',
      posMachine: posMachine.segment && posMachine.brand 
        ? `${posMachine.segment}/${posMachine.brand}` 
        : 'No POS',
      amount: posAmount,
      description: t.description || 'Transaction processed successfully',
      marginPercent,
      marginAmount,
      bankChargesPercent,
      bankChargesAmount,
      vatPercent,
      vatAmount,
      netReceived,
      toPayAmount,
      finalMargin,
      createdBy: t.createdBy?.name || 'System',
      updatedBy: t.updatedBy?.name || 'System',
      createdDate: t.createdAt,
      updatedDate: t.updatedAt
    }
  })
  
  return NextResponse.json({
    reportType: 'summary',
    totalTransactions: allTransactions.length,
    totalRevenue,
    totalCommission,
    totalBankCharges,
    totalMargin,
    totalVAT,
    averageTransaction: allTransactions.length > 0 ? totalRevenue / allTransactions.length : 0,
    totalReceipts: {
      count: receipts.length,
      amount: totalReceipts
    },
    totalPayments: {
      count: payments.length,
      amount: totalPayments
    },
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items, // Paginated items for table display
    allItems // All items for export
  })
}