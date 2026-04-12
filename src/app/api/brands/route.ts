import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Brand from '@/models/Brand'
import '@/models/User'
import { requireAuth, requireRole, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const brands = await Brand.find({})
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 })

    return NextResponse.json({ brands })
  } catch (error) {
    console.error('GET /api/brands error:', error)
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const { name, description, segment, isActive } = await request.json()
    console.log('POST /api/brands - Received data:', { name, description, segment, isActive }) // Debug log

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
    }

    const existing = await Brand.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } })
    if (existing) {
      return NextResponse.json({ error: 'Brand with this name already exists' }, { status: 409 })
    }

    const brandData = {
      name: name.trim(),
      description: description?.trim() || '',
      segment: segment?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
      createdBy: auth.userId,
      updatedBy: auth.userId,
    }
    console.log('Creating brand with data:', brandData) // Debug log

    const brand = await Brand.create(brandData)
    console.log('Created brand:', brand) // Debug log

    return NextResponse.json({ brand }, { status: 201 })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Brand with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 })
  }
}
