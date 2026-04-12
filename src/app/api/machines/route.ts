import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Machine from '@/models/Machine'
import '@/models/User'
import { requireAuth, requireRole, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const machines = await Machine.find({})
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 })

    return NextResponse.json({ machines })
  } catch (error) {
    console.error('GET /api/machines error:', error)
    return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { name, description, isActive } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Machine name is required' }, { status: 400 })
    }

    const existing = await Machine.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } })
    if (existing) {
      return NextResponse.json({ error: 'Machine with this name already exists' }, { status: 409 })
    }

    const machine = await Machine.create({
      name: name.trim(),
      description: description?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
      createdBy: auth.userId,
      updatedBy: auth.userId,
    })

    return NextResponse.json({ machine }, { status: 201 })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Machine with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create machine' }, { status: 500 })
  }
}