const mongoose = require('mongoose');

// Production database connection string
const PRODUCTION_DB_URI = 'mongodb+srv://Vercel-Admin-inventory-mongodb:G49Sf4P3x13dVePa@inventory-mongodb.cpw5ztm.mongodb.net/dsr-app?retryWrites=true&w=majority';

// Connect to Production MongoDB
async function connectToProduction() {
  try {
    await mongoose.connect(PRODUCTION_DB_URI);
    console.log('Connected to PRODUCTION MongoDB');
    console.log('Database:', mongoose.connection.db.databaseName);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function removeExistingMachine() {
  await connectToProduction();
  
  console.log('\n=== REMOVING EXISTING POS MACHINE ===\n');
  
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
  
  // The machine to remove (from our previous analysis)
  const targetMachineId = '69b8faf45c9f3b868c0f855a';
  const targetTerminalId = '34543Akshay';
  
  // First, show the current machine
  console.log('=== CURRENT MACHINE TO BE REMOVED ===');
  const existingMachine = await POSMachine.findById(targetMachineId).populate('assignedAgent');
  
  if (existingMachine) {
    console.log(`✅ Found machine to remove:`);
    console.log(`   ID: ${existingMachine._id}`);
    console.log(`   Terminal ID: ${existingMachine.terminalId}`);
    console.log(`   Segment: ${existingMachine.segment}`);
    console.log(`   Brand: ${existingMachine.brand}`);
    console.log(`   Status: ${existingMachine.status}`);
    console.log(`   Agent: ${existingMachine.assignedAgent ? existingMachine.assignedAgent.name : 'UNASSIGNED'}`);
    console.log(`   Created: ${existingMachine.createdAt}`);
    
    // Remove the machine
    console.log('\\n=== REMOVING MACHINE ===');
    const result = await POSMachine.findByIdAndDelete(targetMachineId);
    
    if (result) {
      console.log('✅ Machine successfully removed!');
      console.log(`   Removed Terminal ID: ${result.terminalId}`);
      console.log(`   Removed ID: ${result._id}`);
    } else {
      console.log('❌ Failed to remove machine');
    }
    
  } else {
    console.log('❌ Machine not found - it may have already been removed');
  }
  
  // Verify removal
  console.log('\\n=== VERIFICATION ===');
  const remainingMachines = await POSMachine.find({}).populate('assignedAgent');
  console.log(`Remaining POS machines in database: ${remainingMachines.length}`);
  
  if (remainingMachines.length > 0) {
    console.log('\\nRemaining machines:');
    remainingMachines.forEach((machine, index) => {
      console.log(`${index + 1}. ${machine.terminalId} (ID: ${machine._id})`);
    });
  } else {
    console.log('✅ Database is now clean - no POS machines remaining');
  }
  
  // Double-check that the specific Terminal ID is gone
  const checkTerminalId = await POSMachine.findOne({ terminalId: targetTerminalId });
  if (checkTerminalId) {
    console.log(`❌ WARNING: Terminal ID "${targetTerminalId}" still exists!`);
  } else {
    console.log(`✅ Confirmed: Terminal ID "${targetTerminalId}" has been removed`);
  }
  
  mongoose.connection.close();
  console.log('\\n🎉 Operation complete! You can now add new POS machines without conflicts.');
}

// Run the removal
removeExistingMachine().catch(console.error);