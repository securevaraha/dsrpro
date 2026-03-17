const mongoose = require('mongoose');

// Production database connection string
const PRODUCTION_DB_URI = 'mongodb+srv://Vercel-Admin-inventory-mongodb:G49Sf4P3x13dVePa@inventory-mongodb.cpw5ztm.mongodb.net/dsr-app?retryWrites=true&w=majority';

// Connect to Production MongoDB
async function connectToProduction() {
  try {
    await mongoose.connect(PRODUCTION_DB_URI);
    console.log('Connected to PRODUCTION MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function checkTransactionData() {
  await connectToProduction();
  
  console.log('\n=== CHECKING TRANSACTION DATA ===\n');
  
  // Define schemas
  const TransactionSchema = new mongoose.Schema({
    transactionId: String,
    type: String,
    posMachine: { type: mongoose.Schema.Types.ObjectId, ref: 'POSMachine' },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    description: String,
    attachments: [String],
    status: String,
    createdAt: Date,
    metadata: Object
  }, { strict: false });
  
  const POSMachineSchema = new mongoose.Schema({
    segment: String,
    brand: String,
    terminalId: String,
    merchantId: String,
    deviceType: String,
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: String,
    status: String,
    createdAt: Date
  }, { strict: false });
  
  const Transaction = mongoose.model('Transaction', TransactionSchema);
  const POSMachine = mongoose.model('POSMachine', POSMachineSchema);
  
  // Get all transactions
  const transactions = await Transaction.find({}).sort({ createdAt: -1 });
  console.log(`=== ALL TRANSACTIONS (${transactions.length} total) ===`);
  
  if (transactions.length === 0) {
    console.log('No transactions found in database');
  } else {
    transactions.forEach((transaction, index) => {
      console.log(`${index + 1}. Transaction ID: ${transaction.transactionId}`);
      console.log(`   Type: ${transaction.type}`);
      console.log(`   Amount: ${transaction.amount}`);
      console.log(`   POS Machine ID: ${transaction.posMachine || 'null'}`);
      console.log(`   Description: ${transaction.description || 'N/A'}`);
      console.log(`   Status: ${transaction.status}`);
      console.log(`   Created: ${transaction.createdAt}`);
      console.log('');
    });
  }
  
  // Get all POS machines for reference
  const posMachines = await POSMachine.find({});
  console.log(`=== ALL POS MACHINES (${posMachines.length} total) ===`);
  posMachines.forEach((machine, index) => {
    console.log(`${index + 1}. ID: ${machine._id}`);
    console.log(`   Terminal ID: ${machine.terminalId}`);
    console.log(`   Segment: ${machine.segment}`);
    console.log(`   Brand: ${machine.brand}`);
    console.log('');
  });
  
  // Test population - simulate what the API does
  console.log('=== TESTING POPULATION (like API does) ===');
  const populatedTransactions = await Transaction.find({})
    .populate('posMachine', 'segment brand terminalId')
    .sort({ createdAt: -1 });
    
  populatedTransactions.forEach((transaction, index) => {
    console.log(`${index + 1}. Transaction: ${transaction.transactionId}`);
    console.log(`   POS Machine (populated):`, transaction.posMachine);
    if (transaction.posMachine) {
      console.log(`   - Segment: ${transaction.posMachine.segment}`);
      console.log(`   - Brand: ${transaction.posMachine.brand}`);
      console.log(`   - Terminal ID: ${transaction.posMachine.terminalId}`);
    } else {
      console.log(`   - No POS machine linked`);
    }
    console.log('');
  });
  
  // Check for orphaned references
  console.log('=== CHECKING FOR ORPHANED REFERENCES ===');
  const transactionsWithPOS = transactions.filter(t => t.posMachine);
  const posIds = posMachines.map(p => p._id.toString());
  
  let orphanedCount = 0;
  transactionsWithPOS.forEach(transaction => {
    const posId = transaction.posMachine.toString();
    if (!posIds.includes(posId)) {
      console.log(`❌ Orphaned reference: Transaction ${transaction.transactionId} references POS ID ${posId} which doesn't exist`);
      orphanedCount++;
    }
  });
  
  if (orphanedCount === 0) {
    console.log('✅ No orphaned POS machine references found');
  } else {
    console.log(`⚠️  Found ${orphanedCount} orphaned POS machine references`);
  }
  
  mongoose.connection.close();
}

// Run the check
checkTransactionData().catch(console.error);