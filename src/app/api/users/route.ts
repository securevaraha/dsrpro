import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const currentUser = await User.findById(decoded.userId)
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    
    const query = role ? { role } : { role: { $in: ['agent', 'vendor'] } }
    const users = await User.find(query).select('-password')
    
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const currentUser = await User.findById(decoded.userId)
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    const { name, email, phone, role, companyName, address, bankDetails } = await request.json()
    
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }
    
    const tempPassword = Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(tempPassword, 12)
    
    const user = new User({
      name,
      email,
      phone,
      role,
      companyName,
      address,
      bankDetails,
      password: hashedPassword,
      status: 'active'
    })
    
    await user.save()
    
    return NextResponse.json({ 
      message: 'User created successfully',
      user: { ...user.toObject(), password: undefined },
      tempPassword
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}