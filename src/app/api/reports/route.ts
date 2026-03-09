import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import User from '@/models/User'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
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
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
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
          dateFilter = {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        }
        break
    }
    
    let query = { ...dateFilter }
    
    if (type === 'payments') {
      query.type = 'payment'
    } else if (type === 'sales') {
      query.type = 'receipt'
    }
    
    const transactions = await Transaction.find(query)
      .populate('vendorId', 'name')
      .populate('agentId', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
    
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const totalCommission = transactions.reduce((sum, t) => sum + (t.commission || 0), 0)
    const averageTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0
    
    const items = transactions.map(t => ({
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