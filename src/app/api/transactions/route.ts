import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import User from '@/models/User'
import Client from '@/models/Client'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const vendorId = searchParams.get('vendorId')
    const agentId = searchParams.get('agentId')
    
    let query: any = {}
    if (status) query.status = status
    if (vendorId) query.vendorId = vendorId
    if (agentId) query.agentId = agentId
    
    const transactions = await Transaction.find(query)
      .populate('vendorId', 'name email')
      .populate('agentId', 'name email')
      .populate('clientId', 'name businessType')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
    
    const total = await Transaction.countDocuments(query)
    
    return NextResponse.json({ 
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const {
      posId,
      vendorId,
      agentId,
      clientId,
      amount,
      paymentMethod,
      description,
      metadata
    } = await request.json()
    
    // Calculate commissions
    const client = await Client.findById(clientId)
    const commission = (amount * client.commissionRate) / 100
    const agentCommission = commission * 0.6 // 60% to agent
    const vendorCommission = commission * 0.4 // 40% to vendor
    
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    
    const transaction = new Transaction({
      transactionId,
      posId,
      vendorId,
      agentId,
      clientId,
      amount,
      commission,
      agentCommission,
      vendorCommission,
      paymentMethod,
      description,
      metadata,
      status: 'completed'
    })
    
    await transaction.save()
    
    return NextResponse.json({ 
      message: 'Transaction created successfully',
      transaction
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}