import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import Notification from '@/models/Notification'

const ALLOWED_SIGNUP_ROLES = ['agent'] as const
const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    const { name, email, password, role, companyName, phone } = body

    // Type checks
    if (!name || !email || !password || typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ message: 'Name, email and password are required' }, { status: 400 })
    }

    const trimmedName = name.trim()
    const normalizedEmail = email.toLowerCase().trim()

    if (trimmedName.length < 2 || trimmedName.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ message: 'Name must be between 2 and 100 characters' }, { status: 400 })
    }

    if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json({ message: 'Email is too long' }, { status: 400 })
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
    }

    if (password.length > 128) {
      return NextResponse.json({ message: 'Password is too long' }, { status: 400 })
    }

    // Password strength: require at least one letter and one number
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ message: 'Password must contain at least one letter and one number' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 })
    }

    // Prevent self-assignment of admin role
    const safeRole = ALLOWED_SIGNUP_ROLES.includes(role) ? role : 'agent'

    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists with this email' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: safeRole,
      companyName: typeof companyName === 'string' ? companyName.trim().slice(0, 200) : undefined,
      phone: typeof phone === 'string' ? phone.trim().slice(0, 20) : undefined,
      status: 'inactive', // Requires admin activation
    })

    // Notify all admins about the new registration
    try {
      const admins = await User.find({ role: 'admin', status: 'active' }).select('_id')
      if (admins.length > 0) {
        await Notification.insertMany(
          admins.map(admin => ({
            userId: admin._id,
            title: 'New Account Registration',
            message: `${trimmedName} (${normalizedEmail}) has registered as ${safeRole} and is awaiting approval.`,
            type: 'warning',
            actionType: 'account_approval',
            actionData: {
              targetUserId: user._id,
              targetRole: safeRole,
              targetName: trimmedName,
              targetEmail: normalizedEmail,
            },
            actionTaken: 'pending',
            actionUrl: '/dashboard/admin',
          }))
        )
      }
    } catch (notifError) {
      console.error('Failed to create admin notifications:', notifError)
    }

    return NextResponse.json({ 
      message: 'Account created successfully. An administrator will review and activate your account.',
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Sign up error:', error)
    
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Email already exists' }, { status: 409 })
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      return NextResponse.json({ message: messages.join(', ') }, { status: 400 })
    }
    
    return NextResponse.json({ message: 'Registration failed' }, { status: 500 })
  }
}