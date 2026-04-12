import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Brand from '@/models/Brand'
import '@/models/User'
import { requireAuth, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const segment = searchParams.get('segment')
    
    if (!segment) {
      return NextResponse.json({ error: 'Segment parameter is required' }, { status: 400 })
    }

    // Find brands that belong to the specified segment
    const brands = await Brand.find({ 
      segment: segment,
      isActive: true 
    })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ name: 1 })

    return NextResponse.json({ brands })
  } catch (error) {
    console.error('GET /api/brands/by-segment error:', error)
    return NextResponse.json({ error: 'Failed to fetch brands by segment' }, { status: 500 })
  }
}