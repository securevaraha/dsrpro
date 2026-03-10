import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import MerchantSettlement from '@/models/MerchantSettlement'
import { requireAuth, requireRole, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    // Agents cannot view settlements
    if (auth.role === 'agent') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    let query: any = {}

    // Vendors can only see their own settlements
    if (auth.role === 'vendor') {
      query.merchantId = auth.userId
    } else if (merchantId) {
      query.merchantId = merchantId
    }

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
    const settlementData = addAuditFields(data, auth.userId)
    
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