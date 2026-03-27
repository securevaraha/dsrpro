import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Notification from '@/models/Notification'
import bcrypt from 'bcryptjs'
import { requireAuth, requireRole, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'
import { randomBytes } from 'crypto'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const isSelfUpdate = id === auth.userId
    
    // Non-admins can only update their own profile
    if (!isSelfUpdate && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    const existingUser = await User.findById(id)
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData = await request.json()

    // Admin password reset: generate random temp password
    if (updateData.resetPassword && auth.role === 'admin' && !isSelfUpdate) {
      const tempPassword = randomBytes(8).toString('base64url')
      const hashedPassword = await bcrypt.hash(tempPassword, 12)
      const auditedData = addAuditFields({ password: hashedPassword }, auth.userId, true)
      
      const user = await User.findByIdAndUpdate(id, auditedData, { new: true }).select('-password')
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json({ message: 'Password reset successfully', tempPassword, user })
    }
    
    // Non-admins cannot change role, status, or other users' data
    if (auth.role !== 'admin') {
      delete updateData.role
      delete updateData.status
      delete updateData.createdBy
      delete updateData.updatedBy
    }

    // Hash password if provided
    if (updateData.password && typeof updateData.password === 'string' && updateData.password.length >= 8) {
      updateData.password = await bcrypt.hash(updateData.password, 12)
    } else {
      delete updateData.password
    }
    
    const auditedData = addAuditFields(updateData, auth.userId, true)
    
    const user = await User.findByIdAndUpdate(
      id,
      auditedData,
      { new: true }
    ).select('-password')
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Notification Logic for Status Changes
    if (updateData.status && existingUser.status !== updateData.status && !isSelfUpdate) {
      try {
        await Notification.create({
          userId: user._id,
          title: `Account Status Updated`,
          message: `Your account status has been changed to ${user.status} by an administrator.`,
          type: user.status === 'active' ? 'success' : 'error'
        })
      } catch (err) {
        console.error('Notification creation failed:', err)
      }
    }
    
    return NextResponse.json({ 
      message: 'User updated successfully',
      user
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Only admin can delete users
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    // Prevent self-deletion
    if (id === auth.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    await connectDB()
    
    const user = await User.findById(id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for assigned POS machines
    const POSMachine = (await import('@/models/POSMachine')).default
    const machineCount = await POSMachine.countDocuments({ assignedAgent: id })
    if (machineCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete user "${user.name}" — they have ${machineCount} POS machine${machineCount > 1 ? 's' : ''} assigned. Unassign or reassign those machines first.` },
        { status: 409 }
      )
    }

    await user.deleteOne()
    
    return NextResponse.json({ 
      message: 'User deleted successfully'
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}