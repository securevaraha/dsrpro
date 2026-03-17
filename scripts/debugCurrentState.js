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

async function debugCurrentState() {
  await connectDB();
  
  console.log('\n=== CURRENT DATABASE STATE ===\n');
  
  // Define schemas
  const POSMachineSchema = new mongoose.Schema({
    segment: String,
    brand: String,
    terminalId: String,
    merchantId: String,
    deviceType: String,
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: String,
    status: String,
    createdAt: Date,
    updatedAt: Date
  }, { strict: false });
  
  const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    companyName: String,
    createdAt: Date
  }, { strict: false });
  
  const POSMachine = mongoose.model('POSMachine', POSMachineSchema);
  const User = mongoose.model('User', UserSchema);
  
  // Get all POS machines (sorted by creation date, newest first)
  const allMachines = await POSMachine.find({})
    .populate('assignedAgent', 'name email role companyName')
    .sort({ createdAt: -1 });
    
  console.log(`Total POS machines in database: ${allMachines.length}\n`);
  
  // Show all machines with detailed info
  console.log('=== ALL POS MACHINES (NEWEST FIRST) ===');
  allMachines.forEach((machine, index) => {
    console.log(`${index + 1}. Terminal ID: ${machine.terminalId}`);
    console.log(`   ID: ${machine._id}`);
    console.log(`   Segment: ${machine.segment || 'N/A'}`);
    console.log(`   Brand: ${machine.brand || 'N/A'}`);
    console.log(`   Status: ${machine.status || 'N/A'}`);
    console.log(`   Assigned Agent: ${machine.assignedAgent ? machine.assignedAgent.name + ' (' + machine.assignedAgent.role + ')' : 'UNASSIGNED'}`);
    console.log(`   Agent ID: ${machine.assignedAgent ? machine.assignedAgent._id : 'null'}`);
    console.log(`   Created: ${machine.createdAt || 'N/A'}`);
    console.log(`   Updated: ${machine.updatedAt || 'N/A'}`);
    console.log('');
  });
  
  // Get all users
  const allUsers = await User.find({}).sort({ createdAt: -1 });
  console.log(`Total users in database: ${allUsers.length}\n`);
  
  console.log('=== ALL USERS ===');
  allUsers.forEach((user, index) => {
    console.log(`${index + 1}. Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Created: ${user.createdAt || 'N/A'}`);
    console.log('');
  });
  
  // Test different query scenarios that the API might use
  console.log('=== TESTING API QUERY SCENARIOS ===');
  
  // Scenario 1: No filters (what admin should see)
  const adminQuery = {};
  const adminResults = await POSMachine.find(adminQuery).sort({ createdAt: -1 });
  console.log(`1. Admin view (no filters): ${adminResults.length} machines`);
  
  // Scenario 2: Check for any status filters
  const activeQuery = { status: 'active' };
  const activeResults = await POSMachine.find(activeQuery).sort({ createdAt: -1 });
  console.log(`2. Active machines only: ${activeResults.length} machines`);
  
  // Scenario 3: Check for pagination (limit 50, skip 0)
  const paginatedResults = await POSMachine.find({}).sort({ createdAt: -1 }).skip(0).limit(50);
  console.log(`3. Paginated (limit 50): ${paginatedResults.length} machines`);
  
  // Scenario 4: Check what the exact API query would return
  console.log('\\n=== SIMULATING EXACT API CALL ===');
  const apiQuery = {};
  const apiResults = await POSMachine.find(apiQuery)
    .populate('assignedAgent', 'name email companyName')
    .sort({ createdAt: -1 })
    .skip(0)
    .limit(50);
    
  console.log(`API simulation results: ${apiResults.length} machines`);
  if (apiResults.length > 0) {
    console.log('First machine returned:');
    console.log(`  Terminal ID: ${apiResults[0].terminalId}`);
    console.log(`  ID: ${apiResults[0]._id}`);
    console.log(`  Created: ${apiResults[0].createdAt}`);
  }
  
  // Check for any potential issues
  console.log('\\n=== POTENTIAL ISSUES ===');
  
  // Check for machines with null/undefined values that might cause issues
  const problematicMachines = allMachines.filter(machine => 
    !machine.terminalId || !machine.segment || !machine.brand
  );
  
  if (problematicMachines.length > 0) {
    console.log(`⚠️  Found ${problematicMachines.length} machines with missing required fields:`);
    problematicMachines.forEach(machine => {
      console.log(`  - ${machine._id}: TID=${machine.terminalId}, Segment=${machine.segment}, Brand=${machine.brand}`);
    });
  } else {
    console.log('✅ All machines have required fields');
  }
  
  mongoose.connection.close();
}

// Run the debug function
debugCurrentState().catch(console.error);