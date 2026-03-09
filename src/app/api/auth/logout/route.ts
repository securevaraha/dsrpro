import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { endSession } from '@/lib/sessionManager'
import dbConnect from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ message: 'No active session' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    // End the session in database
    if (decoded.sessionId) {
      await endSession(decoded.sessionId)
    }

    const response = NextResponse.json({ message: 'Logged out successfully' })
    
    // Clear the cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}