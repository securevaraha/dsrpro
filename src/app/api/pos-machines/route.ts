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

    console.log('GET /api/pos-machines - Auth user:', auth.userId, 'Role:', auth.role)

    await connectDB()
    console.log('Connected to database')

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const brand = searchParams.get('brand')
    const agentId = searchParams.get('agentId')
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500)

    const query: any = {}

    // Agents can only see their own machines
    if (auth.role.toLowerCase() === 'agent') {
      query.assignedAgent = auth.userId
      console.log('Agent query:', query)
    } else if (agentId) {
      query.assignedAgent = agentId
      console.log('Admin query with agentId:', query)
    }

    if (status && status !== 'all') query.status = status
    if (brand && brand !== 'all') query.brand = brand

    console.log('Final query:', query)

    const total = await POSMachine.countDocuments(query)
    console.log('Total count:', total)

    const machines = await POSMachine.find(query)
      .populate('assignedAgent', 'name email companyName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    console.log('Found machines:', machines.length)

    const stats = {
      total: await POSMachine.countDocuments(auth.role.toLowerCase() === 'agent' ? { assignedAgent: auth.userId } : {}),
      active: await POSMachine.countDocuments({ ...(auth.role.toLowerCase() === 'agent' ? { assignedAgent: auth.userId } : {}), status: 'active' }),
      inactive: await POSMachine.countDocuments({ ...(auth.role.toLowerCase() === 'agent' ? { assignedAgent: auth.userId } : {}), status: 'inactive' }),
      maintenance: await POSMachine.countDocuments({ ...(auth.role.toLowerCase() === 'agent' ? { assignedAgent: auth.userId } : {}), status: 'maintenance' }),
    }

    console.log('Stats:', stats)

    return NextResponse.json({ machines, stats, total, page, limit })
  } catch (error: any) {
    console.error('GET /api/pos-machines error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json({ 
      error: 'Failed to fetch POS machines',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth

    await connectDB()

    const body = await request.json()
    console.log('Received POS machine data:', JSON.stringify(body, null, 2))
    
    const { segment, brand, terminalId, merchantId, serialNumber, model, deviceType, assignedAgent, location, bankCharges, vatPercentage, commissionPercentage, status, notes } = body

    if (!segment || !terminalId || !merchantId || !brand || !deviceType) {
      console.log('Validation failed: Missing required fields')
      return NextResponse.json({ error: 'Segment, Terminal ID, Merchant ID, Brand, and Device Type are required' }, { status: 400 })
    }

    // Normalize terminal ID (trim and uppercase)
    const normalizedTerminalId = terminalId.trim().toUpperCase()
    
    // Validate terminal ID format
    if (!/^[A-Z0-9]+$/.test(normalizedTerminalId)) {
      return NextResponse.json({ 
        error: 'Terminal ID must contain only alphanumeric characters' 
      }, { status: 400 })
    }

    // REMOVED: Terminal ID uniqueness check - allowing duplicates

    // Validate assignedAgent if provided
    if (assignedAgent && !mongoose.Types.ObjectId.isValid(assignedAgent)) {
      console.log('Invalid agent ID:', assignedAgent)
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 })
    }

    console.log('Creating machine data...')
    const machineData = addAuditFields({
      segment: segment.trim(),
      brand,
      terminalId: normalizedTerminalId, // Use normalized terminal ID
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

    console.log('Machine data to save:', JSON.stringify(machineData, null, 2))

    const machine = new POSMachine(machineData)
    console.log('Created POSMachine instance, attempting to save...')
    
    await machine.save()
    console.log('Machine saved successfully with ID:', machine._id)

    const populated = await POSMachine.findById(machine._id).populate('assignedAgent', 'name email companyName')
    console.log('Populated machine data:', populated)

    return NextResponse.json({ message: 'POS Machine added successfully', machine: populated })
  } catch (error: any) {
    console.error('POS Machine creation error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error code:', error.code)
    
    // Log the full error object for debugging
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
    if (error.code === 11000) {
      console.log('Duplicate key error details:', error.keyPattern, error.keyValue)
      return NextResponse.json({ 
        error: `Duplicate key error: ${JSON.stringify(error.keyValue)}`,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 400 })
    }
    
    if (error.name === 'ValidationError') {
      console.log('Validation error details:', error.errors)
      const validationErrors = Object.values(error.errors).map((err: any) => err.message)
      return NextResponse.json({ 
        error: `Validation error: ${validationErrors.join(', ')}`,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 400 })
    }
    
    if (error.name === 'CastError') {
      console.log('Cast error:', error.message)
      return NextResponse.json({ 
        error: `Invalid data format: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to add POS machine', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    }, { status: 500 })
  }
}
