import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import MerchantSettlement from '@/models/MerchantSettlement'
import { requireRole, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { id } = await params
    const data = await request.json()

    const settlement = await MerchantSettlement.findById(id)
    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    const updateData = addAuditFields({
      ...(data.paid !== undefined && { paid: parseFloat(data.paid) }),
      ...(data.status && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
    }, auth.userId, true)

    Object.assign(settlement, updateData)
    await settlement.save()

    const populated = await settlement.populate('merchantId', 'name companyName')
    return NextResponse.json({ settlement: populated })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { id } = await params
    const settlement = await MerchantSettlement.findByIdAndDelete(id)

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Settlement deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete settlement' }, { status: 500 })
  }
}
