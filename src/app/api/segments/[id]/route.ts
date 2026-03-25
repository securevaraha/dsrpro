import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Segment from '@/models/Segment'
import { requireRole, isErrorResponse } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { id } = await params
    const { name, description, isActive } = await request.json()

    if (name?.trim()) {
      const existing = await Segment.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' }, _id: { $ne: id } })
      if (existing) {
        return NextResponse.json({ error: 'Segment with this name already exists' }, { status: 409 })
      }
    }

    const segment = await Segment.findByIdAndUpdate(
      id,
      { name: name?.trim(), description: description?.trim() || '', isActive, updatedBy: auth.userId },
      { new: true }
    )

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    return NextResponse.json({ segment })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Segment with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { id } = await params
    const segment = await Segment.findByIdAndDelete(id)

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Segment deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete segment' }, { status: 500 })
  }
}
