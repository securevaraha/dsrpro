import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import POSMachine from '@/models/POSMachine'
import '@/models/User'
import '@/models/Client'
import { requireAuth, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'
import { buildRateSnapshot, calcFinancials, hasSnapshot, ratesFromPos, toDayKey, POS_RATE_FIELDS } from '@/lib/posCharges'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 })
    }

    const transaction = await Transaction.findById(id)
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Only admin can edit any transaction; agents can only edit their own
    if (auth.role === 'agent' && transaction.agentId?.toString() !== auth.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    const updateData = await request.json()
    // Rate snapshot is server-controlled only.
    delete updateData.chargeRates
    // Prevent role escalation via update — strip sensitive fields for non-admin
    if (auth.role !== 'admin') {
      delete updateData.agentId
    }

    const auditedData = addAuditFields(updateData, auth.userId, true)

    if (transaction.type === 'receipt' || updateData.type === 'receipt') {
      const effectiveAmount = Number(updateData.amount ?? transaction.amount ?? 0)
      const effectivePosMachineId = updateData.posMachine ?? transaction.posMachine
      const effectivePaidRaw = Number(updateData.paidAmount ?? transaction.paidAmount ?? 0)
      const effectiveSettlementRaw = Number(updateData.settlementAmount ?? transaction.settlementAmount ?? 0)

      let posMachineDoc: any = null
      if (effectivePosMachineId && mongoose.Types.ObjectId.isValid(String(effectivePosMachineId))) {
        posMachineDoc = await POSMachine.findById(effectivePosMachineId).select(POS_RATE_FIELDS)
      }

      // Keep the receipt's frozen rates unless its POS machine or date changed;
      // then take the rates effective on the (new) date for the (new) machine.
      const effectiveDate = updateData.date ? new Date(updateData.date) : (transaction.date || transaction.createdAt)
      const posChanged = String(effectivePosMachineId || '') !== String(transaction.posMachine || '')
      const dateChanged = !!updateData.date && toDayKey(updateData.date) !== toDayKey(transaction.date || transaction.createdAt)
      let rates: any
      if (hasSnapshot(transaction) && !posChanged && !dateChanged) {
        rates = ratesFromPos(transaction.chargeRates)
      } else if (posMachineDoc) {
        rates = buildRateSnapshot(posMachineDoc, effectiveDate)
        auditedData.chargeRates = rates
      } else {
        rates = ratesFromPos(null)
      }

      // Same formula as reports/settlements: To Pay = amount - charges.
      const toPayAmount = Math.max(0, calcFinancials(effectiveAmount, rates).toPayAmount)
      const paidAmount = Math.max(0, Math.min(effectivePaidRaw, toPayAmount))
      const settlementAmount = Math.max(0, Math.min(effectiveSettlementRaw, Math.max(0, toPayAmount - paidAmount)))
      const dueAmount = Math.max(0, toPayAmount - paidAmount - settlementAmount)

      auditedData.paidAmount = paidAmount
      auditedData.settlementAmount = settlementAmount
      auditedData.dueAmount = dueAmount
    }
    
    const updated = await Transaction.findByIdAndUpdate(
      id,
      auditedData,
      { new: true }
    )
    .populate('agentId', 'name email')
    .populate('clientId', 'name businessType')
    .populate('posMachine', 'segment brand terminalId')
    
    return NextResponse.json({ 
      message: 'Transaction updated successfully',
      transaction: updated
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Only admin can delete transactions
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can delete transactions' }, { status: 403 })
    }

    await connectDB()
    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 })
    }
    
    const transaction = await Transaction.findByIdAndDelete(id)
    
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