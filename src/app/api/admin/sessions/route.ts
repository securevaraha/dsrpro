import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Session from '@/models/Session'
import { requireRole, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const query: any = {}
    if (activeOnly) query.isActive = true

    const sessions = await Session.find(query)
      .populate('userId', 'name email role')
      .sort({ loginTime: -1 })
      .limit(100)

    const activeCount = await Session.countDocuments({ isActive: true })

    return NextResponse.json({ sessions, activeCount })
  } catch (error) {
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
