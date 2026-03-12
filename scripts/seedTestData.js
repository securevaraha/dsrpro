const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// Schemas
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'agent'], default: 'agent' },
  companyName: String,
  phone: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })

const ReceiptSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'upi', 'card'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

const PaymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'upi', 'card'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', UserSchema)
const Receipt = mongoose.models.Receipt || mongoose.model('Receipt', ReceiptSchema)
const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema)

async function seedTestData() {
  try {
    await mongoose.connect('mongodb+srv://Vercel-Admin-inventory-mongodb:G49Sf4P3x13dVePa@inventory-mongodb.cpw5ztm.mongodb.net/dsr-app?retryWrites=true&w=majority')
    console.log('Connected to MongoDB')

    // Clear existing data
    await User.deleteMany({ role: { $ne: 'admin' } })
    await Receipt.deleteMany({})
    await Payment.deleteMany({})

    // Get admin user
    const admin = await User.findOne({ role: 'admin' })
    if (!admin) {
      console.log('Admin not found, please run seed script first')
      return
    }

    // Create test users
    const testUsers = [
      { name: 'Ahmed Al Mansouri', email: 'ahmed@emirates.ae', role: 'agent', companyName: 'Emirates Trading', phone: '+971-4-123-4567' },
      { name: 'Fatima Hassan', email: 'fatima@dubai.ae', role: 'agent', companyName: 'Dubai Gold LLC', phone: '+971-4-234-5678' },
      { name: 'Mohammed Khalil', email: 'mohammed@gulf.ae', role: 'agent', companyName: 'Gulf Electronics', phone: '+971-4-345-6789' }
    ]

    const hashedPassword = await bcrypt.hash('test123', 12)
    const createdUsers = []

    for (const userData of testUsers) {
      const user = await User.create({
        ...userData,
        password: hashedPassword,
        status: 'active'
      })
      createdUsers.push(user)
    }

    // Create test receipts
    const paymentMethods = ['cash', 'bank', 'upi', 'card']
    const descriptions = ['Service payment', 'Product sale', 'Consultation fee', 'Installation charges', 'Maintenance fee']

    for (let i = 1; i <= 10; i++) {
      await Receipt.create({
        receiptNumber: `R${String(i).padStart(3, '0')}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        amount: Math.floor(Math.random() * 10000) + 1000,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        createdBy: admin._id
      })
    }

    // Create test payments
    for (let i = 1; i <= 8; i++) {
      await Payment.create({
        paymentNumber: `P${String(i).padStart(3, '0')}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        agentId: createdUsers[Math.floor(Math.random() * createdUsers.length)]._id,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        amount: Math.floor(Math.random() * 8000) + 500,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        createdBy: admin._id
      })
    }

    console.log('✅ Test data seeded successfully!')
    console.log('👥 Users:', testUsers.length)
    console.log('📄 Receipts: 10')
    console.log('💳 Payments: 8')

  } catch (error) {
    console.error('❌ Error seeding test data:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

seedTestData()