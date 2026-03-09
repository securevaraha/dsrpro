const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'agent', 'vendor'], default: 'agent' },
  companyName: String,
  phone: String,
  address: String,
  bankDetails: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', UserSchema)

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://Vercel-Admin-inventory-mongodb:G49Sf4P3x13dVePa@inventory-mongodb.cpw5ztm.mongodb.net/dsr-app?retryWrites=true&w=majority')
    console.log('Connected to MongoDB')

    // Check if super admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@dsrpro.ae' })
    if (existingAdmin) {
      console.log('Super admin already exists!')
      return
    }

    // Create super admin
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@dsrpro.ae',
      password: hashedPassword,
      role: 'admin',
      companyName: 'DSR Pro',
      phone: '+971-4-555-0123',
      status: 'active'
    })

    console.log('✅ Super Admin created successfully!')
    console.log('📧 Email: admin@dsrpro.ae')
    console.log('🔑 Password: admin123')
    console.log('👤 Role: admin')
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

createSuperAdmin()