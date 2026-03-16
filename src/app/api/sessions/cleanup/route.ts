import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredSessions } from '@/lib/sessionCleanup'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request (optional security)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cleanedCount = await cleanupExpiredSessions()
    
    return NextResponse.json({ 
      success: true, 
      cleanedSessions: cleanedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cleanup cron error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

// Also allow manual cleanup for testing
export async function POST(request: NextRequest) {
  try {
    const cleanedCount = await cleanupExpiredSessions()
    
    return NextResponse.json({ 
      success: true, 
      cleanedSessions: cleanedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Manual cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}