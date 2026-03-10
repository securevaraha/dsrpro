const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

// Load .env.local for local scripts
const fs = require('fs')
const path = require('path')
const envPath = path.resolve(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length) {
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    }
  })
}

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set. Create a .env.local file with your MongoDB connection string.')
  process.exit(1)
}

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
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
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    const existingAdmin = await User.findOne({ email: 'admin@dsrpro.ae' })
    if (existingAdmin) {
      console.log('Super admin already exists!')
      return
    }

    // Generate a random password if not provided via env
    const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url')
    const hashedPassword = await bcrypt.hash(adminPassword, 12)
    
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
    console.log('🔑 Password:', adminPassword)
    console.log('⚠️  Save this password securely — it will not be shown again.')
    console.log('👤 Role: admin')
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

createSuperAdmin()