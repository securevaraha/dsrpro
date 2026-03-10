import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { getUserSessions, endSession } from '@/lib/sessionManager'
import Session from '@/models/Session'
import { requireAuth, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    const sessions = await getUserSessions(auth.userId)
    
    return NextResponse.json({ sessions })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()
    
    const { sessionId } = await request.json()
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Verify the session belongs to the requesting user
    const session = await Session.findOne({ sessionId })
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.userId.toString() !== auth.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await endSession(sessionId)
    
    return NextResponse.json({ message: 'Session ended successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
  }
}