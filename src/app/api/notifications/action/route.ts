import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Notification from '@/models/Notification'
import User from '@/models/User'
import { requireRole, isErrorResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { notificationId, action } = await request.json()

    if (!notificationId || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request. Provide notificationId and action (approved/rejected).' }, { status: 400 })
    }

    const notification = await Notification.findById(notificationId)
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    if (notification.userId.toString() !== auth.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (notification.actionType !== 'account_approval') {
      return NextResponse.json({ error: 'This notification does not support actions' }, { status: 400 })
    }

    if (notification.actionTaken !== 'pending') {
      return NextResponse.json({ error: `Action already taken: ${notification.actionTaken}` }, { status: 409 })
    }

    const targetUserId = notification.actionData?.targetUserId
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user not found in notification' }, { status: 400 })
    }

    const targetUser = await User.findById(targetUserId)
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user no longer exists' }, { status: 404 })
    }

    if (action === 'approved') {
      targetUser.status = 'active'
      await targetUser.save()
    }

    // Mark notification as actioned
    notification.actionTaken = action
    notification.isRead = true
    await notification.save()

    // Also update the same notification for other admins
    await Notification.updateMany(
      {
        actionType: 'account_approval',
        'actionData.targetUserId': targetUserId,
        _id: { $ne: notificationId },
      },
      {
        actionTaken: action,
        isRead: true,
      }
    )

    // Send a notification to the user about their account status
    await Notification.create({
      userId: targetUserId,
      title: action === 'approved' ? 'Account Approved' : 'Account Rejected',
      message: action === 'approved'
        ? 'Your account has been approved. You can now sign in and start using the platform.'
        : 'Your account registration has been rejected. Please contact support for more information.',
      type: action === 'approved' ? 'success' : 'error',
    })

    return NextResponse.json({
      message: `Account ${action} successfully`,
      user: { id: targetUser._id, name: targetUser.name, status: action === 'approved' ? 'active' : 'inactive' },
    })
  } catch (error) {
    console.error('Notification action error:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}
