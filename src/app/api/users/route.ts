import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { requireRole, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const includeAdmins = searchParams.get('includeAdmins') === 'true'
    
    let query: any
    if (role) {
      query = { role }
    } else if (includeAdmins) {
      query = {}
    } else {
      query = { role: 'agent' }
    }
    const users = await User.find(query).sort({ createdAt: -1 })
    
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    
    const { name, email, phone, role, companyName, address, bankDetails, password } = await request.json()
    
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }
    
    const userPassword = password || randomBytes(8).toString('base64url')
    const hashedPassword = await bcrypt.hash(userPassword, 12)
    
    const userData = addAuditFields({
      name: name.trim(),
      email: normalizedEmail,
      phone,
      role: role || 'agent',
      companyName,
      address,
      bankDetails,
      password: hashedPassword,
      status: 'active'
    }, auth.userId)
    
    const user = new User(userData)
    await user.save()
    
    const userObj = user.toObject()
    delete userObj.password
    
    return NextResponse.json({ 
      message: 'User created successfully',
      user: userObj,
      tempPassword: password ? undefined : userPassword
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}