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

// Test the terminal ID validation
async function testTerminalIdValidation() {
  await connectDB();
  
  console.log('\n=== TESTING TERMINAL ID VALIDATION ===\n');
  
  // Test cases
  const testCases = [
    { terminalId: '3453', shouldExist: true },
    { terminalId: '3453', shouldExist: true }, // Duplicate test
    { terminalId: '435435', shouldExist: true },
    { terminalId: 'NEWTEST123', shouldExist: false },
    { terminalId: 'newtest123', shouldExist: false }, // Case insensitive test
    { terminalId: 'ANOTHER456', shouldExist: false },
  ];
  
  // Import the model
  const POSMachineSchema = new mongoose.Schema({
    terminalId: String,
    segment: String,
    brand: String,
    merchantId: String,
    deviceType: String,
  }, { strict: false });
  
  const POSMachine = mongoose.model('POSMachine', POSMachineSchema);
  
  for (const testCase of testCases) {
    console.log(`Testing Terminal ID: ${testCase.terminalId}`);
    
    // Check if it exists (case-insensitive)
    const existing = await POSMachine.findOne({ 
      terminalId: { $regex: new RegExp(`^${testCase.terminalId}$`, 'i') } 
    });
    
    if (existing && testCase.shouldExist) {
      console.log(`✅ PASS: Terminal ID '${testCase.terminalId}' exists as expected (found: '${existing.terminalId}')`);
    } else if (!existing && !testCase.shouldExist) {
      console.log(`✅ PASS: Terminal ID '${testCase.terminalId}' does not exist as expected`);
    } else if (existing && !testCase.shouldExist) {
      console.log(`❌ FAIL: Terminal ID '${testCase.terminalId}' exists but shouldn't (found: '${existing.terminalId}')`);
    } else {
      console.log(`❌ FAIL: Terminal ID '${testCase.terminalId}' should exist but doesn't`);
    }
  }
  
  console.log('\n=== TEST COMPLETE ===');
  mongoose.connection.close();
}

// Run the test
testTerminalIdValidation().catch(console.error);