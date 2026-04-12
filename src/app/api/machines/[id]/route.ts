import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Machine from '@/models/Machine'
import { requireRole, isErrorResponse } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { id } = await params
    const { name, description, isActive } = await request.json()

    if (name?.trim()) {
      const existing = await Machine.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' }, _id: { $ne: id } })
      if (existing) {
        return NextResponse.json({ error: 'Machine with this name already exists' }, { status: 409 })
      }
    }

    const machine = await Machine.findByIdAndUpdate(
      id,
      { 
        name: name?.trim(), 
        description: description?.trim() || '', 
        isActive, 
        updatedBy: auth.userId 
      },
      { new: true }
    )

    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    return NextResponse.json({ machine })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Machine with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { id } = await params
    const machine = await Machine.findById(id)

    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    // Check if machine is being used in POS machines
    const POSMachine = (await import('@/models/POSMachine')).default
    const posCount = await POSMachine.countDocuments({ machineName: machine.name })
    if (posCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete machine "${machine.name}" — it is used by ${posCount} POS machine${posCount > 1 ? 's' : ''}. Remove or reassign those machines first.` },
        { status: 409 }
      )
    }

    await machine.deleteOne()
    return NextResponse.json({ message: 'Machine deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 })
  }
}