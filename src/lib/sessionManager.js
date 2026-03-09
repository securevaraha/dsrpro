import Session from '@/models/Session'
import { v4 as uuidv4 } from 'uuid'

export const createSession = async (userId, req) => {
  const sessionId = uuidv4()
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
  const userAgent = req.headers['user-agent'] || 'unknown'
  
  // Parse device info from user agent
  const deviceInfo = parseUserAgent(userAgent)
  
  const session = new Session({
    userId,
    sessionId,
    ipAddress,
    userAgent,
    deviceInfo,
    isActive: true
  })
  
  await session.save()
  return sessionId
}

export const endSession = async (sessionId) => {
  await Session.findOneAndUpdate(
    { sessionId, isActive: true },
    { 
      logoutTime: new Date(),
      isActive: false 
    }
  )
}

export const getUserSessions = async (userId) => {
  return await Session.find({ userId })
    .sort({ loginTime: -1 })
    .limit(50)
}

export const endAllUserSessions = async (userId) => {
  await Session.updateMany(
    { userId, isActive: true },
    { 
      logoutTime: new Date(),
      isActive: false 
    }
  )
}

const parseUserAgent = (userAgent) => {
  const browser = userAgent.includes('Chrome') ? 'Chrome' :
                 userAgent.includes('Firefox') ? 'Firefox' :
                 userAgent.includes('Safari') ? 'Safari' : 'Unknown'
  
  const os = userAgent.includes('Windows') ? 'Windows' :
            userAgent.includes('Mac') ? 'macOS' :
            userAgent.includes('Linux') ? 'Linux' :
            userAgent.includes('Android') ? 'Android' :
            userAgent.includes('iOS') ? 'iOS' : 'Unknown'
  
  const device = userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
  
  return { browser, os, device }
}