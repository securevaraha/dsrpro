import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import POSMachine from '@/models/POSMachine'
import { requireRole, requireAuth, isErrorResponse } from '@/lib/auth'
import { addAuditFields } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const brand = searchParams.get('brand')
    const agentId = searchParams.get('agentId')
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500)

    const query: any = {}

    // Agents can only see their own machines
    if (auth.role === 'agent') {
      query.assignedAgent = auth.userId
    } else if (agentId) {
      query.assignedAgent = agentId
    }

    if (status && status !== 'all') query.status = status
    if (brand && brand !== 'all') query.brand = brand

    const total = await POSMachine.countDocuments(query)
    const machines = await POSMachine.find(query)
      .populate('assignedAgent', 'name email companyName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const stats = {
      total: await POSMachine.countDocuments(auth.role === 'agent' ? { assignedAgent: auth.userId } : {}),
      active: await POSMachine.countDocuments({ ...(auth.role === 'agent' ? { assignedAgent: auth.userId } : {}), status: 'active' }),
      inactive: await POSMachine.countDocuments({ ...(auth.role === 'agent' ? { assignedAgent: auth.userId } : {}), status: 'inactive' }),
      maintenance: await POSMachine.countDocuments({ ...(auth.role === 'agent' ? { assignedAgent: auth.userId } : {}), status: 'maintenance' }),
    }

    return NextResponse.json({ machines, stats, total, page, limit })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch POS machines' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const body = await request.json()
    const { segment, brand, terminalId, merchantId, serialNumber, model, deviceType, assignedAgent, location, bankCharges, vatPercentage, commissionPercentage, status, notes } = body

    if (!segment || !terminalId || !merchantId || !brand || !deviceType) {
      return NextResponse.json({ error: 'Segment, Terminal ID, Merchant ID, Brand, and Device Type are required' }, { status: 400 })
    }

    const existingTID = await POSMachine.findOne({ terminalId: terminalId.trim() })
    if (existingTID) {
      return NextResponse.json({ error: 'A machine with this Terminal ID already exists' }, { status: 400 })
    }

    // Validate assignedAgent if provided
    if (assignedAgent && !mongoose.Types.ObjectId.isValid(assignedAgent)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 })
    }

    const machineData = addAuditFields({
      segment: segment.trim(),
      brand,
      terminalId: terminalId.trim(),
      merchantId: merchantId.trim(),
      serialNumber: serialNumber?.trim() || '',
      model: model?.trim() || '',
      deviceType,
      assignedAgent: assignedAgent || null,
      location: location?.trim() || '',
      bankCharges: parseFloat(bankCharges) || 0,
      vatPercentage: parseFloat(vatPercentage) || 5,
      commissionPercentage: parseFloat(commissionPercentage) || 0,
      status: status || 'active',
      notes: notes?.trim() || '',
    }, auth.userId)

    const machine = new POSMachine(machineData)
    await machine.save()

    const populated = await POSMachine.findById(machine._id).populate('assignedAgent', 'name email companyName')

    return NextResponse.json({ message: 'POS Machine added successfully', machine: populated })
  } catch (error: any) {
    console.error('POS Machine creation error:', error);
    
    if (error.code === 11000) {
      // Handle duplicate key errors - should only be terminalId now
      return NextResponse.json({ error: 'Terminal ID already exists' }, { status: 400 });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: `Validation error: ${validationErrors.join(', ')}` }, { status: 400 });
    }
    
    if (error.name === 'CastError') {
      return NextResponse.json({ error: `Invalid data format: ${error.message}` }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to add POS machine', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    }, { status: 500 });
  }
}
