import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Notification from '@/models/Notification'
import { requireAuth, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const notifications = await Notification.find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
    
    const unreadCount = await Notification.countDocuments({ 
      userId: auth.userId, 
      isRead: false 
    })
    
    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { notificationId, markAllAsRead } = await request.json()
    
    if (markAllAsRead) {
      await Notification.updateMany(
        { userId: auth.userId, isRead: false },
        { isRead: true }
      )
    } else if (notificationId) {
      const notification = await Notification.findById(notificationId)
      if (!notification || notification.userId.toString() !== auth.userId) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }
      await Notification.findByIdAndUpdate(notificationId, { isRead: true })
    }
    
    return NextResponse.json({ message: 'Notifications updated' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}