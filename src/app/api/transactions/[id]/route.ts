import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import jwt from 'jsonwebtoken'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const updateData = await request.json()
    
    const transaction = await Transaction.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    )
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      message: 'Transaction updated successfully',
      transaction
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
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