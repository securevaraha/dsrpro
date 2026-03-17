import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import POSMachine from '@/models/POSMachine'
import Transaction from '@/models/Transaction'
import User from '@/models/User'
import { requireAuth, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('=== API Test Started ===')
    
    // Test authentication
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) {
      console.log('Auth failed:', auth)
      return auth
    }
    console.log('✅ Auth passed - User:', auth.userId, 'Role:', auth.role)

    // Test database connection
    try {
      await connectDB()
      console.log('✅ Database connected')
    } catch (dbError: any) {
      console.error('❌ Database connection failed:', dbError)
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: dbError.message 
      }, { status: 500 })
    }

    const results: any = {
      auth: { userId: auth.userId, role: auth.role },
      database: 'connected',
      models: {},
      collections: {},
      errors: []
    }

    // Test User model
    try {
      const userCount = await User.countDocuments()
      const sampleUser = await User.findOne().select('name email role')
      results.models.User = '✅ Working'
      results.collections.users = { count: userCount, sample: sampleUser }
      console.log('✅ User model working - Count:', userCount)
    } catch (error: any) {
      console.error('❌ User model error:', error)
      results.models.User = '❌ Error: ' + error.message
      results.errors.push('User model: ' + error.message)
    }

    // Test POSMachine model
    try {
      const posCount = await POSMachine.countDocuments()
      const samplePOS = await POSMachine.findOne().select('segment brand terminalId vatPercentage')
      results.models.POSMachine = '✅ Working'
      results.collections.posmachines = { count: posCount, sample: samplePOS }
      console.log('✅ POSMachine model working - Count:', posCount)
    } catch (error: any) {
      console.error('❌ POSMachine model error:', error)
      results.models.POSMachine = '❌ Error: ' + error.message
      results.errors.push('POSMachine model: ' + error.message)
    }

    // Test Transaction model
    try {
      const transactionCount = await Transaction.countDocuments()
      const sampleTransaction = await Transaction.findOne().select('transactionId type amount posMachine')
      results.models.Transaction = '✅ Working'
      results.collections.transactions = { count: transactionCount, sample: sampleTransaction }
      console.log('✅ Transaction model working - Count:', transactionCount)
    } catch (error: any) {
      console.error('❌ Transaction model error:', error)
      results.models.Transaction = '❌ Error: ' + error.message
      results.errors.push('Transaction model: ' + error.message)
    }

    // Test POSMachine creation (dry run)
    try {
      const testPOSData = {
        segment: 'TEST',
        brand: 'Network',
        terminalId: 'TEST123456789',
        merchantId: 'TEST987654321',
        serialNumber: '',
        model: '',
        deviceType: 'traditional_pos',
        assignedAgent: null,
        location: 'Test Location',
        bankCharges: 1.5,
        vatPercentage: 5,
        commissionPercentage: 2.0,
        status: 'active',
        notes: 'Test machine',
        createdBy: auth.userId,
        updatedBy: auth.userId
      }

      // Validate without saving
      const testPOS = new POSMachine(testPOSData)
      await testPOS.validate()
      results.validation = { POSMachine: '✅ Validation passed' }
      console.log('✅ POSMachine validation passed')
    } catch (error: any) {
      console.error('❌ POSMachine validation error:', error)
      results.validation = { POSMachine: '❌ Validation failed: ' + error.message }
      results.errors.push('POSMachine validation: ' + error.message)
    }

    console.log('=== API Test Completed ===')
    console.log('Results:', JSON.stringify(results, null, 2))

    return NextResponse.json({
      message: 'API Test Completed',
      timestamp: new Date().toISOString(),
      ...results
    })

  } catch (error: any) {
    console.error('=== API Test Failed ===', error)
    return NextResponse.json({ 
      error: 'API test failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}