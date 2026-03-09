import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import MerchantSettlement from '@/models/MerchantSettlement'
import User from '@/models/User'
import { getCurrentUserId, addAuditFields } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    let query: any = {}
    if (merchantId) query.merchantId = merchantId
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }
    
    const settlements = await MerchantSettlement.find(query)
      .populate('merchantId', 'name companyName')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
    
    // Also get summary stats
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
    await connectDB()
    
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const data = await request.json()
    const currentUserId = getCurrentUserId(request)
    const settlementData = addAuditFields(data, currentUserId)
    
    const settlement = new MerchantSettlement(settlementData)
    await settlement.save()
    
    return NextResponse.json({ 
      message: 'Settlement created successfully',
      settlement
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 })
  }
}