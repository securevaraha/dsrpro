import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { createSession } from '@/lib/sessionManager'

const MAX_TOKEN_AGE_SECONDS = 7 * 24 * 60 * 60 // 7 days in seconds

export async function POST(request: NextRequest) {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured')
      return NextResponse.json({ message: 'Server configuration error' }, { status: 500 })
    }

    await dbConnect()

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 })
    }

    const { email, password } = body

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Use the same error message for user-not-found and wrong-password to prevent user enumeration
    const user = await User.findOne({ email: normalizedEmail }).select('+password')
    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    if (user.status === 'inactive') {
      return NextResponse.json({ message: 'Account is deactivated. Contact your administrator.' }, { status: 403 })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    // Create session record
    const sessionId = await createSession(user._id, request)

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Debug: Log cookie setting
    console.log('Setting cookie with token:', token.substring(0, 20) + '...')
    
    const response = NextResponse.json({ 
      message: 'Sign in successful',
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    })

    // Set cookie with explicit options
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: false, // Set to false for localhost
      sameSite: 'lax', // Changed from 'strict' to 'lax'
      maxAge: MAX_TOKEN_AGE_SECONDS,
      path: '/',
    })

    // Debug: Log response headers
    console.log('Response cookies:', response.cookies.getAll())
    
    return response
  } catch (error: any) {
    console.error('Sign in error:', error)
    return NextResponse.json({ message: 'Authentication failed' }, { status: 500 })
  }
}