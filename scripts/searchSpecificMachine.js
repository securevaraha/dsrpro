const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log('Database URI:', process.env.MONGODB_URI?.substring(0, 50) + '...');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function searchSpecificMachine() {
  await connectDB();
  
  console.log('\n=== SEARCHING FOR SPECIFIC MACHINE ===\n');
  
  // The machine ID from browser logs
  const targetMachineId = '69b8faf45c9f3b868c0f855a';
  const targetTerminalId = '34543Akshay';
  
  console.log(`Looking for machine with ID: ${targetMachineId}`);
  console.log(`Looking for machine with Terminal ID: ${targetTerminalId}`);
  
  // Define schema
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
  
  const POSMachine = mongoose.model('POSMachine', POSMachineSchema);
  
  // Search by ID
  console.log('\\n=== SEARCH BY ID ===');
  try {
    const machineById = await POSMachine.findById(targetMachineId).populate('assignedAgent');
    if (machineById) {
      console.log('✅ Found machine by ID:');
      console.log(JSON.stringify(machineById, null, 2));
    } else {
      console.log('❌ No machine found with this ID');
    }
  } catch (error) {
    console.log('❌ Error searching by ID:', error.message);
  }
  
  // Search by Terminal ID
  console.log('\\n=== SEARCH BY TERMINAL ID ===');
  const machineByTerminalId = await POSMachine.findOne({ terminalId: targetTerminalId }).populate('assignedAgent');
  if (machineByTerminalId) {
    console.log('✅ Found machine by Terminal ID:');
    console.log(JSON.stringify(machineByTerminalId, null, 2));
  } else {
    console.log('❌ No machine found with this Terminal ID');
  }
  
  // Search for any machines with similar Terminal ID (case insensitive)
  console.log('\\n=== SEARCH BY SIMILAR TERMINAL ID ===');
  const similarMachines = await POSMachine.find({ 
    terminalId: { $regex: new RegExp(targetTerminalId, 'i') } 
  }).populate('assignedAgent');
  
  if (similarMachines.length > 0) {
    console.log(`✅ Found ${similarMachines.length} machine(s) with similar Terminal ID:`);
    similarMachines.forEach((machine, index) => {
      console.log(`${index + 1}. ${machine.terminalId} (ID: ${machine._id})`);
    });
  } else {
    console.log('❌ No machines found with similar Terminal ID');
  }
  
  // Get the most recent machines to see if there's a newer one
  console.log('\\n=== MOST RECENT MACHINES ===');
  const recentMachines = await POSMachine.find({})
    .populate('assignedAgent')
    .sort({ createdAt: -1 })
    .limit(5);
    
  console.log(`Showing ${recentMachines.length} most recent machines:`);
  recentMachines.forEach((machine, index) => {
    console.log(`${index + 1}. ${machine.terminalId} (ID: ${machine._id}) - Created: ${machine.createdAt}`);
  });
  
  // Check if there are any machines created in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const veryRecentMachines = await POSMachine.find({
    createdAt: { $gte: oneHourAgo }
  }).populate('assignedAgent');
  
  if (veryRecentMachines.length > 0) {
    console.log('\\n=== MACHINES CREATED IN LAST HOUR ===');
    veryRecentMachines.forEach((machine, index) => {
      console.log(`${index + 1}. ${machine.terminalId} (ID: ${machine._id}) - Created: ${machine.createdAt}`);
    });
  }
  
  // Check database connection info
  console.log('\\n=== DATABASE CONNECTION INFO ===');
  console.log('Connected to:', mongoose.connection.db.databaseName);
  console.log('Host:', mongoose.connection.host);
  console.log('Port:', mongoose.connection.port);
  
  mongoose.connection.close();
}

// Run the search
searchSpecificMachine().catch(console.error);