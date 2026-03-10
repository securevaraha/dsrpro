import { NextRequest, NextResponse } from 'next/server'
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
    const vendorId = searchParams.get('vendorId')
    const agentId = searchParams.get('agentId')
    
    let query: any = {}
    if (status) query.status = status

    // Scope data by role
    if (auth.role === 'agent') {
      query.agentId = auth.userId
    } else if (auth.role === 'vendor') {
      query.vendorId = auth.userId
    } else {
      // Admin can filter by vendorId/agentId
      if (vendorId) query.vendorId = vendorId
      if (agentId) query.agentId = agentId
    }
    
    const transactions = await Transaction.find(query)
      .populate('vendorId', 'name email')
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
      vendorId,
      agentId,
      clientId,
      amount,
      paymentMethod,
      description,
      metadata
    } = await request.json()
    
    const transactionId = `${type?.toUpperCase() || 'TXN'}${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    
    // Agents can only create transactions assigned to themselves
    const effectiveAgentId = auth.role === 'agent' ? auth.userId : agentId
    
    const transactionData: any = addAuditFields({
      transactionId,
      type: type || 'transaction',
      posId,
      vendorId,
      agentId: effectiveAgentId,
      clientId,
      amount: parseFloat(amount),
      paymentMethod,
      description,
      metadata,
      status: 'completed'
    }, auth.userId)
    
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
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}