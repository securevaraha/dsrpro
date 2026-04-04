import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { requireRole, isErrorResponse } from '@/lib/auth'
import User from '@/models/User'

const PROTECTED_COLLECTIONS = new Set(['users'])

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    const body = await request.json()
    const password = typeof body?.password === 'string' ? body.password : ''
    const confirmation = typeof body?.confirmation === 'string' ? body.confirmation : ''

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    if (confirmation !== 'DELETE ALL DATA') {
      return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findById(auth.userId).select('+password')
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const passwordOk = await bcrypt.compare(password, user.password)
    if (!passwordOk) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const db = mongoose.connection.db
    if (!db) {
      return NextResponse.json({ error: 'Database not connected' }, { status: 500 })
    }

    const collections = await db.listCollections().toArray()
    const deletionResults = await Promise.all(
      collections
        .filter((collection) => !collection.name.startsWith('system.'))
        .filter((collection) => !PROTECTED_COLLECTIONS.has(collection.name))
        .map(async (collection) => {
          const result = await db.collection(collection.name).deleteMany({})
          return { name: collection.name, deletedCount: result.deletedCount }
        })
    )

    const deletedCollections = deletionResults.length
    const totalDeletedDocuments = deletionResults.reduce((sum, item) => sum + (item.deletedCount || 0), 0)

    return NextResponse.json({
      message: 'All non-user data deleted successfully',
      deletedCollections,
      totalDeletedDocuments,
    })
  } catch (error) {
    console.error('Delete all data error:', error)
    return NextResponse.json({ error: 'Failed to delete all data' }, { status: 500 })
  }
}
