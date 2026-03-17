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

// Define the schema (simplified for debugging)
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

async function debugTerminalIds() {
  await connectDB();
  
  console.log('\n=== DEBUGGING TERMINAL IDs ===\n');
  
  // Get all POS machines
  const machines = await POSMachine.find({}).sort({ createdAt: -1 });
  console.log(`Total POS machines found: ${machines.length}\n`);
  
  if (machines.length === 0) {
    console.log('No POS machines found in database.');
    return;
  }
  
  // Group by terminal ID to find duplicates
  const terminalIdGroups = {};
  
  machines.forEach(machine => {
    const tid = machine.terminalId;
    if (!terminalIdGroups[tid]) {
      terminalIdGroups[tid] = [];
    }
    terminalIdGroups[tid].push(machine);
  });
  
  // Show all terminal IDs
  console.log('=== ALL TERMINAL IDs ===');
  Object.keys(terminalIdGroups).forEach(tid => {
    const count = terminalIdGroups[tid].length;
    const status = count > 1 ? '⚠️  DUPLICATE' : '✅ Unique';
    console.log(`${tid} - ${count} machine(s) - ${status}`);
  });
  
  // Show duplicates in detail
  const duplicates = Object.keys(terminalIdGroups).filter(tid => terminalIdGroups[tid].length > 1);
  
  if (duplicates.length > 0) {
    console.log('\n=== DUPLICATE TERMINAL IDs (DETAILED) ===');
    duplicates.forEach(tid => {
      console.log(`\nTerminal ID: ${tid}`);
      terminalIdGroups[tid].forEach((machine, index) => {
        console.log(`  ${index + 1}. ID: ${machine._id}`);
        console.log(`     Segment: ${machine.segment || 'N/A'}`);
        console.log(`     Brand: ${machine.brand || 'N/A'}`);
        console.log(`     Merchant ID: ${machine.merchantId || 'N/A'}`);
        console.log(`     Status: ${machine.status || 'N/A'}`);
        console.log(`     Created: ${machine.createdAt || 'N/A'}`);
      });
    });
    
    console.log('\n=== RECOMMENDED ACTIONS ===');
    console.log('1. Review the duplicate entries above');
    console.log('2. Decide which entries to keep and which to remove/update');
    console.log('3. Use MongoDB Compass or the database directly to clean up duplicates');
    console.log('4. Or run the cleanup script if you want to auto-remove older duplicates');
  } else {
    console.log('\n✅ No duplicate terminal IDs found!');
  }
  
  // Show recent additions
  console.log('\n=== RECENT ADDITIONS (Last 10) ===');
  machines.slice(0, 10).forEach((machine, index) => {
    console.log(`${index + 1}. ${machine.terminalId} - ${machine.segment || 'N/A'} - ${machine.brand || 'N/A'} - ${machine.createdAt || 'N/A'}`);
  });
  
  mongoose.connection.close();
}

// Run the debug function
debugTerminalIds().catch(console.error);