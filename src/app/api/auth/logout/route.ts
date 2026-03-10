import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { endSession } from '@/lib/sessionManager'
import dbConnect from '@/lib/mongodb'

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
    const token = request.cookies.get('token')?.value
    if (!token) {
      return clearTokenCookie(
        NextResponse.json({ message: 'No active session' }, { status: 200 })
      )
    }

    // Try to end the session in the database, but always clear the cookie
    try {
      if (process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any
        if (decoded.sessionId) {
          await dbConnect()
          await endSession(decoded.sessionId)
        }
      }
    } catch {
      // Token may be expired or invalid — that's fine, we still clear the cookie
    }

    return clearTokenCookie(
      NextResponse.json({ message: 'Logged out successfully' })
    )
  } catch (error) {
    console.error('Logout error:', error)
    // Always clear the cookie even on error
    return clearTokenCookie(
      NextResponse.json({ message: 'Logged out' })
    )
  }
}