import { NextRequest, NextResponse } from 'next/server'
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
    const { segment, brand, terminalId, merchantId, serialNumber, model, deviceType, assignedAgent, location, bankCharges, commissionPercentage, status, notes } = body

    if (!segment || !terminalId || !merchantId || !serialNumber || !brand || !deviceType) {
      return NextResponse.json({ error: 'Segment, Terminal ID, Merchant ID, Serial Number, Brand, and Device Type are required' }, { status: 400 })
    }

    const existingTID = await POSMachine.findOne({ terminalId: terminalId.trim() })
    if (existingTID) {
      return NextResponse.json({ error: 'A machine with this Terminal ID already exists' }, { status: 400 })
    }

    const existingSerial = await POSMachine.findOne({ serialNumber: serialNumber.trim() })
    if (existingSerial) {
      return NextResponse.json({ error: 'A machine with this Serial Number already exists' }, { status: 400 })
    }

    const machineData = addAuditFields({
      segment: segment.trim(),
      brand,
      terminalId: terminalId.trim(),
      merchantId: merchantId.trim(),
      serialNumber: serialNumber.trim(),
      model: model?.trim() || '',
      deviceType,
      assignedAgent: assignedAgent || null,
      location: location?.trim() || '',
      bankCharges: parseFloat(bankCharges) || 0,
      commissionPercentage: parseFloat(commissionPercentage) || 0,
      status: status || 'active',
      notes: notes?.trim() || '',
    }, auth.userId)

    const machine = new POSMachine(machineData)
    await machine.save()

    const populated = await POSMachine.findById(machine._id).populate('assignedAgent', 'name email companyName')

    return NextResponse.json({ message: 'POS Machine added successfully', machine: populated })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Duplicate Terminal ID or Serial Number' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to add POS machine' }, { status: 500 })
  }
}
