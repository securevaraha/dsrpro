import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import POSMachine from '@/models/POSMachine'
import { requireRole, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { id } = await params
    const body = await request.json()
    const { segment, brand, terminalId, merchantId, serialNumber, model, deviceType, assignedAgent, location, bankCharges, vatPercentage, commissionPercentage, status, notes } = body

    const existing = await POSMachine.findById(id)
    if (!existing) {
      return NextResponse.json({ error: 'POS Machine not found' }, { status: 404 })
    }

    if (terminalId && terminalId.trim() !== existing.terminalId) {
      const dup = await POSMachine.findOne({ terminalId: terminalId.trim(), _id: { $ne: id } })
      if (dup) return NextResponse.json({ error: 'Terminal ID already in use' }, { status: 400 })
    }

    const updateData = addAuditFields({
      ...(typeof segment === 'string' && { segment: segment.trim() }),
      ...(brand && { brand }),
      ...(typeof terminalId === 'string' && { terminalId: terminalId.trim() }),
      ...(typeof merchantId === 'string' && { merchantId: merchantId.trim() }),
      ...(typeof serialNumber === 'string' && { serialNumber: serialNumber?.trim() || '' }),
      ...(typeof model === 'string' && { model: model?.trim() || '' }),
      ...(deviceType && { deviceType }),
      ...(assignedAgent !== undefined && { assignedAgent: assignedAgent || null }),
      ...(typeof location === 'string' && { location: location.trim() }),
      ...(typeof bankCharges !== 'undefined' && { bankCharges: parseFloat(bankCharges) || 0 }),
      ...(typeof vatPercentage !== 'undefined' && { vatPercentage: parseFloat(vatPercentage) || 5 }),
      ...(typeof commissionPercentage !== 'undefined' && { commissionPercentage: parseFloat(commissionPercentage) || 0 }),
      ...(status && { status }),
      ...(typeof notes === 'string' && { notes: notes.trim() }),
    }, auth.userId, true)

    const machine = await POSMachine.findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedAgent', 'name email companyName')

    return NextResponse.json({ message: 'POS Machine updated', machine })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update POS machine' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { id } = await params
    const machine = await POSMachine.findByIdAndDelete(id)
    if (!machine) {
      return NextResponse.json({ error: 'POS Machine not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'POS Machine deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete POS machine' }, { status: 500 })
  }
}
