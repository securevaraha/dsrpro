import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Brand from '@/models/Brand'
import { requireRole, isErrorResponse } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { id } = await params
    const { name, description, isActive } = await request.json()

    if (name?.trim()) {
      const existing = await Brand.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' }, _id: { $ne: id } })
      if (existing) {
        return NextResponse.json({ error: 'Brand with this name already exists' }, { status: 409 })
      }
    }

    const brand = await Brand.findByIdAndUpdate(
      id,
      { name: name?.trim(), description: description?.trim() || '', isActive, updatedBy: auth.userId },
      { new: true }
    )

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    return NextResponse.json({ brand })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Brand with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { id } = await params
    const brand = await Brand.findById(id)

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const POSMachine = (await import('@/models/POSMachine')).default
    const machineCount = await POSMachine.countDocuments({ brand: brand.name })
    if (machineCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete brand "${brand.name}" — it is assigned to ${machineCount} POS machine${machineCount > 1 ? 's' : ''}. Remove or reassign those machines first.` },
        { status: 409 }
      )
    }

    await brand.deleteOne()
    return NextResponse.json({ message: 'Brand deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 })
  }
}
