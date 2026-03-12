import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import User from '@/models/User'
import Client from '@/models/Client'
import { requireAuth, requireRole, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const agentId = searchParams.get('agentId')
    
    let query: any = {}
    if (status) query.status = status
    if (type) query.type = type

    // Scope data by role
    if (auth.role === 'agent') {
      query.agentId = auth.userId
    } else {
      // Admin can filter by agentId
      if (agentId) query.agentId = agentId
    }
    
    const transactions = await Transaction.find(query)
      .populate('agentId', 'name email')
      .populate('clientId', 'name businessType')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
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
    // Only admin and agent can create transactions
    const auth = requireRole(request, ['admin', 'agent'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    
    const {
      type,
      posId,
      agentId,
      clientId,
      amount,
      paymentMethod,
      description,
      metadata
    } = await request.json()
    
    const transactionId = `${type?.toUpperCase() || 'TXN'}${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    
    // Validate amount
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    // Validate clientId if provided
    if (clientId && !mongoose.Types.ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 })
    }

    // Agents can only create transactions assigned to themselves
    const effectiveAgentId = auth.role === 'agent' ? auth.userId : agentId
    
    const transactionData: any = addAuditFields({
      transactionId,
      type: type || 'transaction',
      posId,
      agentId: effectiveAgentId,
      clientId,
      amount: parsedAmount,
      paymentMethod,
      description,
      metadata,
      status: 'completed'
    }, auth.userId)
    
    // Calculate commissions only if client exists
    if (clientId) {
      const client = await Client.findById(clientId)
      if (client) {
        const commission = (parsedAmount * client.commissionRate) / 100
        transactionData.commission = commission
        transactionData.agentCommission = commission
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
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}