import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import User from '@/models/User'
import Client from '@/models/Client'
import jwt from 'jsonwebtoken'
import { getCurrentUserId, addAuditFields } from '@/lib/audit'

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
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
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
    
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const {
      type,
      posId,
      vendorId,
      agentId,
      clientId,
      amount,
      paymentMethod,
      description,
      metadata
    } = await request.json()
    
    const transactionId = `${type?.toUpperCase() || 'TXN'}${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    
    const currentUserId = getCurrentUserId(request)
    
    const transactionData: any = addAuditFields({
      transactionId,
      type: type || 'transaction',
      posId,
      vendorId,
      agentId,
      clientId,
      amount: parseFloat(amount),
      paymentMethod,
      description,
      metadata,
      status: 'completed'
    }, currentUserId)
    
    // Calculate commissions only if client exists
    if (clientId) {
      const client = await Client.findById(clientId)
      if (client) {
        const commission = (amount * client.commissionRate) / 100
        transactionData.commission = commission
        transactionData.agentCommission = commission * 0.6
        transactionData.vendorCommission = commission * 0.4
      }
    }
    
    const transaction = new Transaction(transactionData)
    await transaction.save()
    
    return NextResponse.json({ 
      message: 'Transaction created successfully',
      transaction
    })
  } catch (error) {
    console.error('Transaction creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}