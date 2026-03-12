import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { requireAuth, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const user = await User.findById(auth.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        companyName: user.companyName || '',
        address: user.address || '',
      }
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { name, phone, companyName, address } = await request.json()

    // Only allow updating safe fields (not email, role, status)
    const updateData: Record<string, string> = {}
    if (name && typeof name === 'string') updateData.name = name.trim().slice(0, 100)
    if (typeof phone === 'string') updateData.phone = phone.trim().slice(0, 20)
    if (typeof companyName === 'string') updateData.companyName = companyName.trim().slice(0, 200)
    if (typeof address === 'string') updateData.address = address.trim().slice(0, 500)

    const user = await User.findByIdAndUpdate(
      auth.userId,
      updateData,
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        companyName: user.companyName || '',
        address: user.address || '',
      }
    })
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
