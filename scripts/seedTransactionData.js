const mongoose = require('mongoose')

// Connect to MongoDB
async function seedTransactionData() {
  try {
    await mongoose.connect('mongodb+srv://Vercel-Admin-inventory-mongodb:G49Sf4P3x13dVePa@inventory-mongodb.cpw5ztm.mongodb.net/inventory-mongodb?retryWrites=true&w=majority')
    console.log('Connected to MongoDB')

    // Define Transaction schema (same as the model)
    const transactionSchema = new mongoose.Schema({
      transactionId: { type: String, required: true, unique: true },
      posId: { type: String, required: false },
      agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
      clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: false },
      amount: { type: Number, required: true },
      commission: { type: Number, default: 0 },
      agentCommission: { type: Number, default: 0 },
      type: { type: String, enum: ['sale', 'refund', 'void', 'payment', 'receipt'], default: 'sale' },
      status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled', 'due'], default: 'pending' },
      posMachine: { type: mongoose.Schema.Types.ObjectId, ref: 'POSMachine', required: false },
      paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'bank'], required: false },
      description: String,
      attachments: [{ type: String, required: false }],
      metadata: {
        cardType: String,
        bankName: String,
        upiId: String,
        receiptNumber: String,
        paymentNumber: String
      },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }, { timestamps: true })

    const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema)

    // Get admin user
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      role: String
    }, { timestamps: true }))

    const admin = await User.findOne({ role: { $in: ['admin', 'ADMIN'] } })
    if (!admin) {
      console.log('Admin not found')
      return
    }

    // Get or create a POS machine
    const posMachineSchema = new mongoose.Schema({
      segment: String,
      brand: String,
      terminalId: String,
      bankCharges: Number,
      vatPercentage: Number,
      commissionPercentage: Number,
      status: String
    }, { timestamps: true })

    const POSMachine = mongoose.models.POSMachine || mongoose.model('POSMachine', posMachineSchema)
    
    let posMachine = await POSMachine.findOne()
    if (!posMachine) {
      posMachine = await POSMachine.create({
        segment: 'Retail',
        brand: 'Ingenico',
        terminalId: 'T001',
        bankCharges: 2.7,
        vatPercentage: 5,
        commissionPercentage: 3.75,
        status: 'active'
      })
    }

    // Clear existing transactions
    await Transaction.deleteMany({})

    // Create sample transactions for the current month
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const paymentMethods = ['cash', 'card', 'upi', 'bank']
    const types = ['receipt', 'payment', 'sale']
    const descriptions = [
      'POS Transaction - Card Payment',
      'Cash Receipt - Service Payment', 
      'UPI Payment - Product Sale',
      'Bank Transfer - Consultation Fee',
      'Card Payment - Installation Charges'
    ]

    const transactions = []
    
    // Create 20 transactions for current month
    for (let i = 1; i <= 20; i++) {
      const randomDay = Math.floor(Math.random() * 28) + 1 // Random day in month
      const transactionDate = new Date(currentYear, currentMonth, randomDay)
      
      const transaction = {
        transactionId: `TXN${String(i).padStart(6, '0')}`,
        agentId: admin._id,
        amount: Math.floor(Math.random() * 5000) + 500, // Random amount between 500-5500
        commission: Math.floor(Math.random() * 200) + 50,
        type: types[Math.floor(Math.random() * types.length)],
        status: 'completed',
        posMachine: posMachine._id,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        metadata: {
          receiptNumber: `RCP${String(i).padStart(6, '0')}`
        },
        createdBy: admin._id,
        updatedBy: admin._id,
        createdAt: transactionDate,
        updatedAt: transactionDate
      }
      
      transactions.push(transaction)
    }

    // Insert all transactions
    await Transaction.insertMany(transactions)

    console.log('✅ Transaction data seeded successfully!')
    console.log(`📊 Created ${transactions.length} transactions for current month`)
    console.log('🏪 POS Machine configured with:')
    console.log(`   - Bank Charges: ${posMachine.bankCharges}%`)
    console.log(`   - VAT: ${posMachine.vatPercentage}%`)
    console.log(`   - Commission: ${posMachine.commissionPercentage}%`)

  } catch (error) {
    console.error('❌ Error seeding transaction data:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

seedTransactionData()