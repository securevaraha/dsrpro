import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import { requireAuth, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const transaction = await Transaction.findById(params.id)
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Only admin can edit any transaction; agents can only edit their own
    if (auth.role === 'agent' && transaction.agentId?.toString() !== auth.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    if (auth.role === 'vendor') {
      return NextResponse.json({ error: 'Vendors cannot modify transactions' }, { status: 403 })
    }
    
    const updateData = await request.json()
    // Prevent role escalation via update — strip sensitive fields for non-admin
    if (auth.role !== 'admin') {
      delete updateData.agentId
      delete updateData.vendorId
    }

    const auditedData = addAuditFields(updateData, auth.userId, true)
    
    const updated = await Transaction.findByIdAndUpdate(
      params.id,
      auditedData,
      { new: true }
    )
    
    return NextResponse.json({ 
      message: 'Transaction updated successfully',
      transaction: updated
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Only admin can delete transactions
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can delete transactions' }, { status: 403 })
    }

    await connectDB()
    
    const transaction = await Transaction.findByIdAndDelete(params.id)
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      message: 'Transaction deleted successfully'
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}