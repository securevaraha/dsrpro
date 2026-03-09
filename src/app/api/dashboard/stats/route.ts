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
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfYear = new Date(today.getFullYear(), 0, 1)
    
    // Today's stats
    const todayTransactions = await Transaction.aggregate([
      { $match: { createdAt: { $gte: today }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    
    // Monthly stats
    const monthlyTransactions = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, commission: { $sum: '$commission' } } }
    ])
    
    // Yearly stats
    const yearlyTransactions = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startOfYear }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    
    // Active vendors count
    const activeVendors = await User.countDocuments({ role: 'vendor', status: 'active' })
    
    // Pending payments
    const pendingPayments = await Transaction.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    
    const stats = {
      totalReceipts: {
        today: todayTransactions[0]?.total || 0,
        month: monthlyTransactions[0]?.total || 0,
        year: yearlyTransactions[0]?.total || 0
      },
      totalPayments: {
        today: todayTransactions[0]?.total || 0,
        month: monthlyTransactions[0]?.total || 0,
        year: yearlyTransactions[0]?.total || 0
      },
      pendingPayments: pendingPayments[0]?.total || 0,
      activeVendors,
      totalTransactions: monthlyTransactions[0]?.count || 0,
      totalCommission: monthlyTransactions[0]?.commission || 0
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}