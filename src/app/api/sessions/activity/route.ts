import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isErrorResponse } from '@/lib/auth'
import { updateSessionActivity } from '@/lib/sessionCleanup'
import { jwtVerify } from 'jose'

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    // Get session ID from JWT token
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No session token' }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    const sessionId = payload.sessionId as string

    if (sessionId) {
      await updateSessionActivity(sessionId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session activity update error:', error)
    return NextResponse.json({ error: 'Failed to update session activity' }, { status: 500 })
  }
}