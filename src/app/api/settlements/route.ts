import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import MerchantSettlement from '@/models/MerchantSettlement'
import Notification from '@/models/Notification'
import { requireAuth, requireRole, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    // Only admin can view settlements
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    let query: any = {}

    if (merchantId) {
      query.merchantId = merchantId
    }

    if (startDate && endDate) {
      const parsedStart = new Date(startDate)
      const parsedEnd = new Date(endDate)
      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }
      query.date = {
        $gte: parsedStart,
        $lte: parsedEnd
      }
    }
    
    const settlements = await MerchantSettlement.find(query)
      .populate('merchantId', 'name companyName')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
    
    const totalStats = await MerchantSettlement.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$ccSales' },
          totalMargin: { $sum: '$margin' },
          totalPaid: { $sum: '$paid' },
          totalBalance: { $sum: '$balance' }
        }
      }
    ])
    
    return NextResponse.json({ 
      settlements,
      stats: totalStats[0] || { totalSales: 0, totalMargin: 0, totalPaid: 0, totalBalance: 0 }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only admin can create settlements
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()
    
    const data = await request.json()

    // Validate required fields
    if (!data.merchantId || !data.date) {
      return NextResponse.json({ error: 'Merchant ID and date are required' }, { status: 400 })
    }

    // Validate numeric fields are non-negative
    const numericFields = ['ccSales', 'margin', 'paid', 'balance']
    for (const field of numericFields) {
      if (data[field] !== undefined) {
        const val = parseFloat(data[field])
        if (isNaN(val) || val < 0) {
          return NextResponse.json({ error: `${field} must be a non-negative number` }, { status: 400 })
        }
        data[field] = val
      }
    }

    const settlementData = addAuditFields(data, auth.userId)
    
    const settlement = new MerchantSettlement(settlementData)
    await settlement.save()

    // Notification Logic
    try {
      await Notification.create({
        userId: settlement.merchantId,
        title: 'Settlement Processed',
        message: `A settlement of ${settlement.netReceived} has been processed for your account.`,
        type: 'success'
      })
    } catch (err) {
      console.error('Notification creation failed:', err)
    }

    
    return NextResponse.json({ 
      message: 'Settlement created successfully',
      settlement
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 })
  }
}