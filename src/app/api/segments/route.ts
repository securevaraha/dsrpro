import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Segment from '@/models/Segment'
import { requireAuth, requireRole, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const segments = await Segment.find({})
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ name: 1 })

    return NextResponse.json({ segments })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { name, description } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Segment name is required' }, { status: 400 })
    }

    const segment = await Segment.create({
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: auth.userId,
      updatedBy: auth.userId,
    })

    return NextResponse.json({ segment }, { status: 201 })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Segment with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 })
  }
}
