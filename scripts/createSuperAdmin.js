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
        let value = valueParts.join('=').trim()
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        process.env[key.trim()] = value
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
  role: { type: String, enum: ['admin', 'agent'], default: 'agent' },
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
      console.log('ℹ️  Super admin already exists. No changes made.')
      console.log('📧 Email: admin@dsrpro.ae')
      console.log('   To reset the password, use the admin panel or the /api/profile/password endpoint.')
      return
    }

    // Generate a strong random password
    const adminPassword = crypto.randomBytes(16).toString('base64url')
    const hashedPassword = await bcrypt.hash(adminPassword, 12)
    
    await User.create({
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔑 TEMPORARY PASSWORD (save this now, it will not be shown again):')
    console.log(`   ${adminPassword}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  Change this password immediately after first login!')
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

createSuperAdmin()