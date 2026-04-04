import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/mongodb'
import { requireRole, isErrorResponse } from '@/lib/auth'
import User from '@/models/User'
import Session from '@/models/Session'
import Notification from '@/models/Notification'

function clearTokenCookie(response: NextResponse) {
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })

  return response
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    const body = await request.json()
    const password = typeof body?.password === 'string' ? body.password : ''
    const confirmation = typeof body?.confirmation === 'string' ? body.confirmation : ''

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    if (confirmation !== 'DELETE ACCOUNT') {
      return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findById(auth.userId).select('+password')
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const passwordOk = await bcrypt.compare(password, user.password)
    if (!passwordOk) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    await Promise.all([
      Session.deleteMany({ userId: user._id }),
      Notification.deleteMany({ userId: user._id }),
      User.findByIdAndDelete(user._id),
    ])

    return clearTokenCookie(NextResponse.json({ message: 'Account deleted successfully' }))
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
