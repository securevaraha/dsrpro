const mongoose = require('mongoose');

// Production database connection string
const PRODUCTION_DB_URI = 'mongodb+srv://Vercel-Admin-inventory-mongodb:G49Sf4P3x13dVePa@inventory-mongodb.cpw5ztm.mongodb.net/dsr-app?retryWrites=true&w=majority';

// Connect to Production MongoDB
async function connectToProduction() {
  try {
    await mongoose.connect(PRODUCTION_DB_URI);
    console.log('Connected to PRODUCTION MongoDB');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function checkProductionData() {
  await connectToProduction();
  
  console.log('\n=== PRODUCTION DATABASE ANALYSIS ===\n');
  
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
  
  // Get all users
  const users = await User.find({}).sort({ createdAt: -1 });
  console.log(`=== USERS IN PRODUCTION (${users.length} total) ===`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: "${user.role}"`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Created: ${user.createdAt || 'N/A'}`);
    console.log('');
  });
  
  // Get all POS machines
  const machines = await POSMachine.find({})
    .populate('assignedAgent', 'name email role companyName')
    .sort({ createdAt: -1 });
    
  console.log(`=== POS MACHINES IN PRODUCTION (${machines.length} total) ===`);
  machines.forEach((machine, index) => {
    console.log(`${index + 1}. Terminal ID: ${machine.terminalId}`);
    console.log(`   ID: ${machine._id}`);
    console.log(`   Segment: ${machine.segment || 'N/A'}`);
    console.log(`   Brand: ${machine.brand || 'N/A'}`);
    console.log(`   Status: ${machine.status || 'N/A'}`);
    console.log(`   Assigned Agent: ${machine.assignedAgent ? machine.assignedAgent.name + ' (' + machine.assignedAgent.role + ')' : 'UNASSIGNED'}`);
    console.log(`   Agent ID: ${machine.assignedAgent ? machine.assignedAgent._id : 'null'}`);
    console.log(`   Created: ${machine.createdAt || 'N/A'}`);
    console.log('');
  });
  
  // Look for the specific machine from browser logs
  const targetMachineId = '69b8faf45c9f3b868c0f855a';
  const targetTerminalId = '34543Akshay';
  
  console.log(`=== SEARCHING FOR SPECIFIC MACHINE ===`);
  console.log(`Looking for ID: ${targetMachineId}`);
  console.log(`Looking for Terminal ID: ${targetTerminalId}`);
  
  try {
    const specificMachine = await POSMachine.findById(targetMachineId).populate('assignedAgent');
    if (specificMachine) {
      console.log('✅ Found the machine from browser logs:');
      console.log(`   Terminal ID: ${specificMachine.terminalId}`);
      console.log(`   Segment: ${specificMachine.segment}`);
      console.log(`   Brand: ${specificMachine.brand}`);
      console.log(`   Status: ${specificMachine.status}`);
      console.log(`   Agent: ${specificMachine.assignedAgent ? specificMachine.assignedAgent.name : 'UNASSIGNED'}`);
      console.log(`   Created: ${specificMachine.createdAt}`);
    } else {
      console.log('❌ Machine not found by ID');
    }
  } catch (error) {
    console.log('❌ Error finding machine:', error.message);
  }
  
  // Test admin vs agent filtering
  console.log(`\\n=== TESTING ROLE-BASED FILTERING ===`);
  
  // Find admin users
  const adminUsers = users.filter(user => user.role.toLowerCase() === 'admin');
  const agentUsers = users.filter(user => user.role.toLowerCase() === 'agent');
  
  console.log(`Admin users: ${adminUsers.length}`);
  adminUsers.forEach(admin => {
    console.log(`  - ${admin.name} (${admin.email})`);
  });
  
  console.log(`Agent users: ${agentUsers.length}`);
  agentUsers.forEach(agent => {
    console.log(`  - ${agent.name} (${agent.email})`);
  });
  
  // Test what each role should see
  if (agentUsers.length > 0) {
    const firstAgent = agentUsers[0];
    const agentMachines = await POSMachine.find({ assignedAgent: firstAgent._id });
    console.log(`\\nAgent "${firstAgent.name}" should see: ${agentMachines.length} machines`);
  }
  
  const adminMachines = await POSMachine.find({});
  console.log(`Admin should see: ${adminMachines.length} machines`);
  
  // Check for role case issues
  const roleIssues = users.filter(user => user.role !== user.role.toLowerCase());
  if (roleIssues.length > 0) {
    console.log(`\\n⚠️  ROLE CASE ISSUES FOUND:`);
    roleIssues.forEach(user => {
      console.log(`  - ${user.name}: "${user.role}" should be "${user.role.toLowerCase()}"`);
    });
  } else {
    console.log(`\\n✅ All user roles are properly lowercase`);
  }
  
  mongoose.connection.close();
}

// Run the check
checkProductionData().catch(console.error);