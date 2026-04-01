const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

async function checkAndCreateAdmin() {
  try {
    await mongoose.connect('mongodb+srv://Vercel-Admin-inventory-mongodb:G49Sf4P3x13dVePa@inventory-mongodb.cpw5ztm.mongodb.net/inventory-mongodb?retryWrites=true&w=majority')
    console.log('Connected to MongoDB')

    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      status: String
    }, { timestamps: true })

    const User = mongoose.models.User || mongoose.model('User', userSchema)

    // Check existing users
    const users = await User.find({})
    console.log('Existing users:', users.length)
    
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`)
    })

    // Check if admin exists
    let admin = await User.findOne({ role: 'admin' })
    
    if (!admin) {
      console.log('Creating admin user...')
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      admin = await User.create({
        name: 'Super Admin',
        email: 'admin@dsrpro.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      })
      
      console.log('✅ Admin user created successfully!')
    } else {
      console.log('✅ Admin user already exists')
    }

    console.log('Admin details:', {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

checkAndCreateAdmin()