import connectDB from '@/lib/mongodb'
import Session from '@/models/Session'

const SESSION_TIMEOUT = 10 * 60 * 1000 // 10 minutes in milliseconds

export async function cleanupExpiredSessions() {
  try {
    await connectDB()
    
    const cutoffTime = new Date(Date.now() - SESSION_TIMEOUT)
    
    // Mark sessions as inactive if last activity was more than 10 minutes ago
    const result = await Session.updateMany(
      {
        isActive: true,
        lastActivity: { $lt: cutoffTime }
      },
      {
        $set: {
          isActive: false,
          logoutTime: new Date()
        }
      }
    )
    
    console.log(`Cleaned up ${result.modifiedCount} expired sessions`)
    return result.modifiedCount
  } catch (error) {
    console.error('Session cleanup error:', error)
    return 0
  }
}

export async function updateSessionActivity(sessionId: string) {
  try {
    await connectDB()
    
    await Session.updateOne(
      { sessionId, isActive: true },
      { 
        $set: { 
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + SESSION_TIMEOUT)
        }
      }
    )
  } catch (error) {
    console.error('Session activity update error:', error)
  }
}

export async function getActiveSessions() {
  try {
    await connectDB()
    
    // First cleanup expired sessions
    await cleanupExpiredSessions()
    
    // Then return only truly active sessions
    const sessions = await Session.find({ isActive: true })
      .populate('userId', 'name email role')
      .sort({ lastActivity: -1 })
    
    return sessions
  } catch (error) {
    console.error('Get active sessions error:', error)
    return []
  }
}