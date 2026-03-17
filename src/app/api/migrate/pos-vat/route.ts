import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import POSMachine from '@/models/POSMachine'
import { requireRole, isErrorResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Only super admin can run migrations
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()

    // Update all existing documents to add vatPercentage field if missing
    const updateResult = await POSMachine.updateMany(
      { vatPercentage: { $exists: false } },
      { $set: { vatPercentage: 5 } }
    )

    // Ensure serialNumber and model are not required for existing documents
    const updateResult2 = await POSMachine.updateMany(
      { 
        $or: [
          { serialNumber: { $exists: false } },
          { model: { $exists: false } }
        ]
      },
      { 
        $set: { 
          serialNumber: '',
          model: ''
        }
      }
    )

    return NextResponse.json({
      message: 'Migration completed successfully',
      vatPercentageUpdated: updateResult.modifiedCount,
      serialModelUpdated: updateResult2.modifiedCount
    })

  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      error: 'Migration failed',
      details: error.message 
    }, { status: 500 })
  }
}