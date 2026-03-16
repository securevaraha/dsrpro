import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Session from '@/models/Session'
import { requireRole, isErrorResponse } from '@/lib/auth'
import { getActiveSessions, cleanupExpiredSessions } from '@/lib/sessionCleanup'

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    if (activeOnly) {
      // Use the cleanup utility for active sessions
      const sessions = await getActiveSessions()
      return NextResponse.json({ 
        sessions, 
        activeCount: sessions.length 
      })
    } else {
      // For all sessions, still cleanup first
      await cleanupExpiredSessions()
      
      await connectDB()
      const sessions = await Session.find({})
        .populate('userId', 'name email role')
        .sort({ loginTime: -1 })
        .limit(100)

      const activeCount = await Session.countDocuments({ isActive: true })
      return NextResponse.json({ sessions, activeCount })
    }
  } catch (error) {
    console.error('Sessions API error:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { sessionId } = await request.json()
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const session = await Session.findOneAndUpdate(
      { sessionId, isActive: true },
      { isActive: false, logoutTime: new Date() }
    )

    if (!session) {
      return NextResponse.json({ error: 'Session not found or already ended' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Session terminated successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to terminate session' }, { status: 500 })
  }
}
