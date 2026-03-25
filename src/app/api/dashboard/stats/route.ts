import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import User from '@/models/User'
import POSMachine from '@/models/POSMachine'
import { requireAuth, isErrorResponse } from '@/lib/auth'

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  switch (period) {
    case 'today': {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    case 'week': {
      const start = new Date(now)
      const day = start.getDay()
      const diff = day === 0 ? -6 : 1 - day // Monday start
      start.setDate(start.getDate() + diff)
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start, end }
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end }
    }
    default: {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today'
    const { start, end } = getPeriodRange(period)

    const roleFilter: any = {}
    if (auth.role === 'agent') {
      roleFilter.agentId = auth.userId
    }

    const dateFilter = { $gte: start, $lte: end }

    // Receipts for period
    const receiptsAgg = await Transaction.aggregate([
      { $match: { ...roleFilter, createdAt: dateFilter, status: 'completed', type: { $in: ['sale', 'receipt'] } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])

    // Payments for period
    const paymentsAgg = await Transaction.aggregate([
      { $match: { ...roleFilter, createdAt: dateFilter, status: 'completed', type: 'payment' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])

    // Active agents count
    const activeAgents = await User.countDocuments({ role: 'agent', status: 'active' })

    // POS machines count
    const posMachinesFilter = auth.role === 'agent' ? { assignedAgent: auth.userId } : {}
    const totalPOSMachines = await POSMachine.countDocuments(posMachinesFilter)

    // Revenue trend — period-aware
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const trendLabels: string[] = []
    const trendData: number[] = []

    if (period === 'today') {
      // Hourly breakdown for today (0–23)
      const hourlyTrend = await Transaction.aggregate([
        { $match: { ...roleFilter, createdAt: dateFilter, status: 'completed', type: { $in: ['sale', 'receipt'] } } },
        { $group: { _id: { hour: { $hour: '$createdAt' } }, total: { $sum: '$amount' } } },
        { $sort: { '_id.hour': 1 } }
      ])
      const hourMap: Record<number, number> = {}
      hourlyTrend.forEach((r: any) => { hourMap[r._id.hour] = r.total })
      for (let h = 0; h < 24; h++) {
        trendLabels.push(`${h.toString().padStart(2, '0')}:00`)
        trendData.push(hourMap[h] || 0)
      }
    } else if (period === 'week') {
      // Daily breakdown for current week (Mon–Sun)
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const dailyTrend = await Transaction.aggregate([
        { $match: { ...roleFilter, createdAt: dateFilter, status: 'completed', type: { $in: ['sale', 'receipt'] } } },
        { $group: { _id: { dayOfWeek: { $dayOfWeek: '$createdAt' } }, total: { $sum: '$amount' } } },
        { $sort: { '_id.dayOfWeek': 1 } }
      ])
      // MongoDB dayOfWeek: 1=Sun, 2=Mon ... 7=Sat → remap to Mon-first
      const dayMap: Record<number, number> = {}
      dailyTrend.forEach((r: any) => { dayMap[r._id.dayOfWeek] = r.total })
      const order = [2, 3, 4, 5, 6, 7, 1] // Mon=2 ... Sun=1
      order.forEach((d, i) => {
        trendLabels.push(dayNames[i])
        trendData.push(dayMap[d] || 0)
      })
    } else if (period === 'month') {
      // Daily breakdown for current month
      const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
      const dailyTrend = await Transaction.aggregate([
        { $match: { ...roleFilter, createdAt: dateFilter, status: 'completed', type: { $in: ['sale', 'receipt'] } } },
        { $group: { _id: { day: { $dayOfMonth: '$createdAt' } }, total: { $sum: '$amount' } } },
        { $sort: { '_id.day': 1 } }
      ])
      const dayMap: Record<number, number> = {}
      dailyTrend.forEach((r: any) => { dayMap[r._id.day] = r.total })
      for (let d = 1; d <= daysInMonth; d++) {
        trendLabels.push(String(d))
        trendData.push(dayMap[d] || 0)
      }
    } else {
      // year — monthly breakdown
      const yearlyTrend = await Transaction.aggregate([
        { $match: { ...roleFilter, createdAt: dateFilter, status: 'completed', type: { $in: ['sale', 'receipt'] } } },
        { $group: { _id: { month: { $month: '$createdAt' } }, total: { $sum: '$amount' } } },
        { $sort: { '_id.month': 1 } }
      ])
      const monthMap: Record<number, number> = {}
      yearlyTrend.forEach((r: any) => { monthMap[r._id.month] = r.total })
      for (let m = 1; m <= 12; m++) {
        trendLabels.push(monthNames[m - 1])
        trendData.push(monthMap[m] || 0)
      }
    }

    // Transaction status breakdown for period
    const statusBreakdown = await Transaction.aggregate([
      { $match: { ...roleFilter, createdAt: dateFilter } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
    const statusMap: Record<string, number> = {}
    statusBreakdown.forEach((s: any) => { statusMap[s._id] = s.count })

    // Bank charges, VAT, margin from POS-linked receipts for period
    const receiptsWithPOS = await Transaction.find({
      ...roleFilter,
      createdAt: dateFilter,
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

    return NextResponse.json({
      totalReceipts: receiptsAgg[0]?.total || 0,
      totalPayments: paymentsAgg[0]?.total || 0,
      totalMargin: totalMargin || receiptsAgg[0]?.commission || 0,
      totalBankCharges,
      totalVAT,
      activeAgents,
      totalPOSMachines,
      totalTransactions: (receiptsAgg[0]?.count || 0) + (paymentsAgg[0]?.count || 0),
      monthlyTrend: { labels: trendLabels, data: trendData },
      transactionStatus: {
        completed: statusMap['completed'] || 0,
        pending: statusMap['pending'] || 0,
        failed: statusMap['failed'] || 0,
      }
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
