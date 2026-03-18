import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import User from '@/models/User'
import POSMachine from '@/models/POSMachine'
import { requireAuth, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfYear = new Date(today.getFullYear(), 0, 1)

    // Scope data by role: agents see their own, admins see all
    const roleFilter: any = {}
    if (auth.role === 'agent') {
      roleFilter.agentId = auth.userId
    }
    
    // Today's receipt stats (sales/receipts)
    const todayReceipts = await Transaction.aggregate([
      { $match: { ...roleFilter, createdAt: { $gte: today }, status: 'completed', type: { $in: ['sale', 'receipt'] } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    
    // Monthly receipt stats
    const monthlyReceipts = await Transaction.aggregate([
      { $match: { ...roleFilter, createdAt: { $gte: startOfMonth }, status: 'completed', type: { $in: ['sale', 'receipt'] } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, commission: { $sum: '$commission' } } }
    ])
    
    // Yearly receipt stats
    const yearlyReceipts = await Transaction.aggregate([
      { $match: { ...roleFilter, createdAt: { $gte: startOfYear }, status: 'completed', type: { $in: ['sale', 'receipt'] } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])

    // Today's payment stats
    const todayPayments = await Transaction.aggregate([
      { $match: { ...roleFilter, createdAt: { $gte: today }, status: 'completed', type: 'payment' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    
    // Monthly payment stats
    const monthlyPayments = await Transaction.aggregate([
      { $match: { ...roleFilter, createdAt: { $gte: startOfMonth }, status: 'completed', type: 'payment' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    
    // Yearly payment stats
    const yearlyPayments = await Transaction.aggregate([
      { $match: { ...roleFilter, createdAt: { $gte: startOfYear }, status: 'completed', type: 'payment' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    
    // Active agents count
    const activeAgents = await User.countDocuments({ role: 'agent', status: 'active' })
    
    // POS machines count
    const posMachinesFilter = auth.role === 'agent' ? { assignedAgent: auth.userId } : {}
    const totalPOSMachines = await POSMachine.countDocuments(posMachinesFilter)
    const activePOSMachines = await POSMachine.countDocuments({ ...posMachinesFilter, status: 'active' })
    
    // Pending payments
    const pendingPayments = await Transaction.aggregate([
      { $match: { ...roleFilter, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])

    // Monthly revenue trend (last 6 months)
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1)
    const monthlyTrend = await Transaction.aggregate([
      {
        $match: {
          ...roleFilter,
          createdAt: { $gte: sixMonthsAgo },
          status: 'completed',
          type: { $in: ['sale', 'receipt'] }
        }
      },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])

    // Build a complete 6-month series (fill gaps with 0)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const trendLabels: string[] = []
    const trendData: number[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      trendLabels.push(monthNames[m - 1])
      const found = monthlyTrend.find((r: any) => r._id.year === y && r._id.month === m)
      trendData.push(found ? found.total : 0)
    }

    // Transaction status breakdown (current month)
    const statusBreakdown = await Transaction.aggregate([
      { $match: { ...roleFilter, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
    const statusMap: Record<string, number> = {}
    statusBreakdown.forEach((s: any) => { statusMap[s._id] = s.count })
    
    // Calculate monthly bank charges and VAT from receipts linked to POS machines
    const receiptsWithPOS = await Transaction.find({
      ...roleFilter,
      createdAt: { $gte: startOfMonth },
      type: { $in: ['sale', 'receipt'] },
      posMachine: { $exists: true, $ne: null }
    })
      .populate('posMachine', 'bankCharges vatPercentage commissionPercentage')
      .select('amount posMachine')

    let totalBankCharges = 0
    let totalVAT = 0
    let totalMargin = 0
    for (const txn of receiptsWithPOS) {
      const pos = (txn as any).posMachine
      const amt = (txn as any).amount || 0
      if (pos) {
        totalBankCharges += amt * ((pos.bankCharges || 0) / 100)
        totalVAT += amt * ((pos.vatPercentage || 0) / 100)
        totalMargin += amt * ((pos.commissionPercentage || 0) / 100)
      }
    }

    const stats = {
      totalReceipts: {
        today: todayReceipts[0]?.total || 0,
        month: monthlyReceipts[0]?.total || 0,
        year: yearlyReceipts[0]?.total || 0
      },
      totalPayments: {
        today: todayPayments[0]?.total || 0,
        month: monthlyPayments[0]?.total || 0,
        year: yearlyPayments[0]?.total || 0
      },
      pendingPayments: pendingPayments[0]?.total || 0,
      activeAgents,
      totalPOSMachines,
      activePOSMachines,
      totalTransactions: (monthlyReceipts[0]?.count || 0) + (monthlyPayments[0]?.count || 0),
      totalCommission: totalMargin || monthlyReceipts[0]?.commission || 0,
      totalBankCharges,
      totalVAT,
      monthlyTrend: { labels: trendLabels, data: trendData },
      transactionStatus: {
        completed: statusMap['completed'] || 0,
        pending: statusMap['pending'] || 0,
        failed: statusMap['failed'] || 0,
        cancelled: statusMap['cancelled'] || 0
      }
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}