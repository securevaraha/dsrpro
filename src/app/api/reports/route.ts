import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import { requireAuth, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'sales'
    const range = searchParams.get('range') || 'month'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
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
    
    let query: any = { ...dateFilter }
    
    if (type === 'payments') {
      query.type = 'payment'
    } else if (type === 'sales') {
      query.type = 'sale'
    }

    // Scope by role — agents only see their own data
    if (auth.role === 'agent') {
      query.agentId = auth.userId
    }
    
    const transactions = await Transaction.find(query)
      .populate('agentId', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
    
    const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
    const totalCommission = transactions.reduce((sum: number, t: any) => sum + (t.commission || 0), 0)
    const averageTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0
    
    const items = transactions.map((t: any) => ({
      date: t.createdAt,
      description: t.description || `Transaction ${t.transactionId}`,
      amount: t.amount,
      status: t.status || 'completed'
    }))
    
    return NextResponse.json({
      totalRevenue,
      totalTransactions: transactions.length,
      totalCommission,
      averageTransaction,
      items
    })
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}