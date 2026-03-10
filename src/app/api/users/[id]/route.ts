import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { requireAuth, requireRole, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'
import { randomBytes } from 'crypto'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const isSelfUpdate = params.id === auth.userId
    
    // Non-admins can only update their own profile
    if (!isSelfUpdate && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    const updateData = await request.json()

    // Admin password reset: generate random temp password
    if (updateData.resetPassword && auth.role === 'admin' && !isSelfUpdate) {
      const tempPassword = randomBytes(8).toString('base64url')
      const hashedPassword = await bcrypt.hash(tempPassword, 12)
      const auditedData = addAuditFields({ password: hashedPassword }, auth.userId, true)
      
      const user = await User.findByIdAndUpdate(params.id, auditedData, { new: true }).select('-password')
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
      params.id,
      auditedData,
      { new: true }
    ).select('-password')
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      message: 'User updated successfully',
      user
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Only admin can delete users
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    // Prevent self-deletion
    if (params.id === auth.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    await connectDB()
    
    const user = await User.findByIdAndDelete(params.id)
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      message: 'User deleted successfully'
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}