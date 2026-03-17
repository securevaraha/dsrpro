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

async function debugCurrentError() {
  await connectToProduction();
  
  console.log('\n=== DEBUGGING CURRENT 500 ERROR ===\n');
  
  try {
    // Get the POSMachine collection
    const db = mongoose.connection.db;
    const collection = db.collection('posmachines');
    
    // Check all current POS machines
    console.log('=== CURRENT POS MACHINES ===');
    const machines = await collection.find({}).toArray();
    console.log(`Total machines: ${machines.length}`);
    
    machines.forEach((machine, index) => {
      console.log(`${index + 1}. ID: ${machine._id}`);
      console.log(`   Terminal ID: ${machine.terminalId}`);
      console.log(`   Serial Number: "${machine.serialNumber}"`);
      console.log(`   Segment: ${machine.segment}`);
      console.log(`   Brand: ${machine.brand}`);
      console.log(`   Created: ${machine.createdAt}`);
      console.log('');
    });
    
    // Check all indexes again
    console.log('=== CURRENT INDEXES ===');
    const indexes = await collection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key));
      if (index.unique) {
        console.log(`   - UNIQUE: ${index.unique}`);
      }
    });
    
    // Test the exact data that's failing
    console.log('\\n=== TESTING FAILING DATA ===');
    const failingData = {
      segment: 'sdfdsfdsf',
      brand: 'Network',
      terminalId: 'SDF453543',
      merchantId: 'd345dfdsf',
      deviceType: 'traditional_pos',
      assignedAgent: new mongoose.Types.ObjectId('69aed88bb4bc05e2078a350a'),
      location: 'efgs',
      bankCharges: 1.75,
      vatPercentage: 5,
      commissionPercentage: 1.75,
      status: 'active',
      notes: 'fdsvdgf',
      serialNumber: '',
      model: '',
      createdBy: new mongoose.Types.ObjectId('69aed88bb4bc05e2078a350a'),
      updatedBy: new mongoose.Types.ObjectId('69aed88bb4bc05e2078a350a'),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check if any field values already exist
    console.log('Checking for existing values...');
    
    // Check terminal ID
    const existingTerminalId = await collection.findOne({ terminalId: failingData.terminalId });
    if (existingTerminalId) {
      console.log(`⚠️  Terminal ID "${failingData.terminalId}" already exists (ID: ${existingTerminalId._id})`);
    } else {
      console.log(`✅ Terminal ID "${failingData.terminalId}" is available`);
    }
    
    // Check serial number
    const existingSerialNumber = await collection.findOne({ serialNumber: failingData.serialNumber });
    if (existingSerialNumber) {
      console.log(`⚠️  Serial Number "${failingData.serialNumber}" already exists (ID: ${existingSerialNumber._id})`);
    } else {
      console.log(`✅ Serial Number "${failingData.serialNumber}" is available`);
    }
    
    // Check merchant ID (in case there's a constraint we missed)
    const existingMerchantId = await collection.findOne({ merchantId: failingData.merchantId });
    if (existingMerchantId) {
      console.log(`⚠️  Merchant ID "${failingData.merchantId}" already exists (ID: ${existingMerchantId._id})`);
    } else {
      console.log(`✅ Merchant ID "${failingData.merchantId}" is available`);
    }
    
    // Try to insert the failing data
    console.log('\\n=== ATTEMPTING INSERT ===');
    try {
      const result = await collection.insertOne(failingData);
      console.log(`✅ Successfully inserted! ID: ${result.insertedId}`);
      
      // Clean up
      await collection.deleteOne({ _id: result.insertedId });
      console.log('✅ Cleaned up test record');
      
    } catch (insertError) {
      console.log(`❌ Insert failed: ${insertError.message}`);
      console.log('Error code:', insertError.code);
      console.log('Error details:', insertError);
      
      // If it's a duplicate key error, show which field is causing it
      if (insertError.code === 11000) {
        console.log('\\n🔍 DUPLICATE KEY ERROR ANALYSIS:');
        console.log('Key pattern:', insertError.keyPattern);
        console.log('Key value:', insertError.keyValue);
        
        // Find which index is causing the issue
        const problematicField = Object.keys(insertError.keyPattern)[0];
        const problematicValue = insertError.keyValue[problematicField];
        console.log(`\\n⚠️  The field "${problematicField}" with value "${problematicValue}" is causing the duplicate key error`);
        
        // Check if there's still a unique index we missed
        const problematicIndex = indexes.find(index => 
          index.key[problematicField] && index.unique
        );
        
        if (problematicIndex) {
          console.log(`\\n🎯 FOUND THE PROBLEM: Unique index "${problematicIndex.name}" on field "${problematicField}"`);
          console.log('Attempting to drop this index...');
          
          try {
            await collection.dropIndex(problematicIndex.name);
            console.log(`✅ Successfully dropped problematic index: ${problematicIndex.name}`);
            
            // Try insert again
            console.log('\\n=== RETRY AFTER INDEX DROP ===');
            const retryResult = await collection.insertOne(failingData);
            console.log(`✅ SUCCESS! Inserted after dropping index. ID: ${retryResult.insertedId}`);
            
            // Clean up
            await collection.deleteOne({ _id: retryResult.insertedId });
            console.log('✅ Cleaned up retry test record');
            
          } catch (dropError) {
            console.log(`❌ Failed to drop index: ${dropError.message}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error during debugging:', error);
  }
  
  mongoose.connection.close();
  console.log('\\n🔍 Debugging complete!');
}

// Run the debug
debugCurrentError().catch(console.error);