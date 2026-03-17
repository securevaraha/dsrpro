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

async function fixDatabaseIndexes() {
  await connectToProduction();
  
  console.log('\n=== FIXING DATABASE INDEXES ===\n');
  
  try {
    // Get the POSMachine collection
    const db = mongoose.connection.db;
    const collection = db.collection('posmachines');
    
    // Check current indexes
    console.log('=== CURRENT INDEXES ===');
    const indexes = await collection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key));
      if (index.unique) {
        console.log(`   - UNIQUE: ${index.unique}`);
      }
    });
    
    // Look for the problematic unique index on terminalId
    const terminalIdIndex = indexes.find(index => 
      index.key.terminalId && index.unique
    );
    
    if (terminalIdIndex) {
      console.log(`\\n⚠️  Found unique index on terminalId: ${terminalIdIndex.name}`);
      console.log('Attempting to drop this index...');
      
      try {
        await collection.dropIndex(terminalIdIndex.name);
        console.log(`✅ Successfully dropped unique index: ${terminalIdIndex.name}`);
      } catch (dropError) {
        console.log(`❌ Failed to drop index: ${dropError.message}`);
      }
    } else {
      console.log('✅ No unique index found on terminalId');
    }
    
    // Create a non-unique index for performance
    console.log('\\n=== CREATING NON-UNIQUE INDEX ===');
    try {
      await collection.createIndex({ terminalId: 1 }, { unique: false });
      console.log('✅ Created non-unique index on terminalId');
    } catch (createError) {
      console.log(`⚠️  Index creation note: ${createError.message}`);
    }
    
    // Test adding a POS machine with the same data from the error
    console.log('\\n=== TESTING POS MACHINE CREATION ===');
    
    const testData = {
      segment: 'Educate 2',
      brand: 'Network',
      terminalId: '3243435353',
      merchantId: '34534535345',
      deviceType: 'traditional_pos',
      assignedAgent: new mongoose.Types.ObjectId('69aed88bb4bc05e2078a350a'),
      location: 'dsfsd',
      bankCharges: 1.75,
      vatPercentage: 5,
      commissionPercentage: 1.75,
      status: 'active',
      notes: 'sdfdsfd',
      serialNumber: '',
      model: '',
      createdBy: new mongoose.Types.ObjectId('69aed88bb4bc05e2078a350a'),
      updatedBy: new mongoose.Types.ObjectId('69aed88bb4bc05e2078a350a')
    };
    
    try {
      // Check if this terminal ID already exists
      const existing = await collection.findOne({ terminalId: testData.terminalId });
      if (existing) {
        console.log(`⚠️  Terminal ID ${testData.terminalId} already exists:`);
        console.log(`   - ID: ${existing._id}`);
        console.log(`   - Segment: ${existing.segment}`);
        console.log(`   - Brand: ${existing.brand}`);
        console.log('   This should now be allowed with duplicate terminal IDs');
      } else {
        console.log(`✅ Terminal ID ${testData.terminalId} is available`);
      }
      
      // Try to insert the test data
      const result = await collection.insertOne({
        ...testData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ Successfully created test POS machine with ID: ${result.insertedId}`);
      
      // Clean up - remove the test record
      await collection.deleteOne({ _id: result.insertedId });
      console.log('✅ Cleaned up test record');
      
    } catch (insertError) {
      console.log(`❌ Failed to create test POS machine: ${insertError.message}`);
      console.log('Error details:', insertError);
    }
    
    // Show final index state
    console.log('\\n=== FINAL INDEX STATE ===');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key));
      if (index.unique) {
        console.log(`   - UNIQUE: ${index.unique}`);
      }
    });
    
  } catch (error) {
    console.error('Error during index operations:', error);
  }
  
  mongoose.connection.close();
  console.log('\\n🎉 Database index fix complete!');
}

// Run the fix
fixDatabaseIndexes().catch(console.error);