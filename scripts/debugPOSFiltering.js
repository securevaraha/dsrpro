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

async function debugPOSMachinesFiltering() {
  await connectDB();
  
  console.log('\n=== DEBUGGING POS MACHINES FILTERING ===\n');
  
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
  
  // Get all POS machines
  const allMachines = await POSMachine.find({}).populate('assignedAgent', 'name email role companyName');
  console.log(`Total POS machines in database: ${allMachines.length}\n`);
  
  // Show all machines with their assignment status
  console.log('=== ALL POS MACHINES ===');
  allMachines.forEach((machine, index) => {
    console.log(`${index + 1}. Terminal ID: ${machine.terminalId}`);
    console.log(`   Segment: ${machine.segment || 'N/A'}`);
    console.log(`   Brand: ${machine.brand || 'N/A'}`);
    console.log(`   Status: ${machine.status || 'N/A'}`);
    console.log(`   Assigned Agent: ${machine.assignedAgent ? machine.assignedAgent.name + ' (' + machine.assignedAgent.role + ')' : 'UNASSIGNED'}`);
    console.log(`   Agent ID: ${machine.assignedAgent ? machine.assignedAgent._id : 'null'}`);
    console.log('');
  });
  
  // Get all users
  const allUsers = await User.find({});
  console.log(`Total users in database: ${allUsers.length}\n`);
  
  console.log('=== ALL USERS ===');
  allUsers.forEach((user, index) => {
    console.log(`${index + 1}. Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user._id}`);
    console.log('');
  });
  
  // Test different query scenarios
  console.log('=== TESTING QUERY SCENARIOS ===');
  
  // Scenario 1: No filters (admin view)
  const noFilterQuery = {};
  const noFilterResults = await POSMachine.find(noFilterQuery);
  console.log(`1. No filters (admin view): ${noFilterResults.length} machines`);
  
  // Scenario 2: Agent view (assuming first user is an agent)
  const agents = allUsers.filter(user => user.role === 'agent');
  if (agents.length > 0) {
    const agentQuery = { assignedAgent: agents[0]._id };
    const agentResults = await POSMachine.find(agentQuery);
    console.log(`2. Agent view (${agents[0].name}): ${agentResults.length} machines`);
  } else {
    console.log('2. No agents found in database');
  }
  
  // Scenario 3: Unassigned machines
  const unassignedQuery = { assignedAgent: null };
  const unassignedResults = await POSMachine.find(unassignedQuery);
  console.log(`3. Unassigned machines: ${unassignedResults.length} machines`);
  
  // Scenario 4: Active machines only
  const activeQuery = { status: 'active' };
  const activeResults = await POSMachine.find(activeQuery);
  console.log(`4. Active machines only: ${activeResults.length} machines`);
  
  console.log('\n=== RECOMMENDATIONS ===');
  if (allMachines.length > 1 && unassignedResults.length === allMachines.length) {
    console.log('⚠️  All machines are unassigned. If you\'re logged in as an agent, you won\'t see any machines.');
    console.log('💡 Solution: Assign machines to agents or log in as an admin.');
  } else if (allMachines.length > 1) {
    console.log('✅ Machines exist and some are assigned. Check your user role and authentication.');
  }
  
  mongoose.connection.close();
}

// Run the debug function
debugPOSMachinesFiltering().catch(console.error);