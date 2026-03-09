import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { getUserSessions, endSession } from '@/lib/sessionManager'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const sessions = await getUserSessions(decoded.userId)
    
    return NextResponse.json({ sessions })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    
    const { sessionId } = await request.json()
    await endSession(sessionId)
    
    return NextResponse.json({ message: 'Session ended successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
  }
}