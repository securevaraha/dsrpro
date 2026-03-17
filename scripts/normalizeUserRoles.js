const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function normalizeUserRoles() {
  await connectDB();
  
  console.log('\n=== NORMALIZING USER ROLES ===\n');
  
  // Define user schema
  const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    companyName: String,
    createdAt: Date
  }, { strict: false });
  
  const User = mongoose.model('User', UserSchema);
  
  // Get all users
  const users = await User.find({});
  console.log(`Found ${users.length} users\n`);
  
  // Show current roles
  console.log('=== CURRENT ROLES ===');
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name} - Role: "${user.role}"`);
  });
  
  // Normalize roles
  console.log('\n=== NORMALIZING ROLES ===');
  let updatedCount = 0;
  
  for (const user of users) {
    const originalRole = user.role;
    const normalizedRole = user.role.toLowerCase();
    
    if (originalRole !== normalizedRole) {
      await User.findByIdAndUpdate(user._id, { role: normalizedRole });
      console.log(`✅ Updated ${user.name}: "${originalRole}" → "${normalizedRole}"`);
      updatedCount++;
    } else {
      console.log(`⏭️  ${user.name}: "${originalRole}" (already normalized)`);
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total users: ${users.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Already normalized: ${users.length - updatedCount}`);
  
  // Verify the changes
  console.log('\n=== VERIFICATION ===');
  const updatedUsers = await User.find({});
  updatedUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name} - Role: "${user.role}"`);
  });
  
  mongoose.connection.close();
  console.log('\n✅ Role normalization complete!');
}

// Run the normalization
normalizeUserRoles().catch(console.error);