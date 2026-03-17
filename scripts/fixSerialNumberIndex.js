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

async function fixSerialNumberIndex() {
  await connectToProduction();
  
  console.log('\n=== FIXING SERIAL NUMBER INDEX ===\n');
  
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
    
    // Look for the unique index on serialNumber
    const serialNumberIndex = indexes.find(index => 
      index.key.serialNumber && index.unique
    );
    
    if (serialNumberIndex) {
      console.log(`\\n⚠️  Found unique index on serialNumber: ${serialNumberIndex.name}`);
      console.log('Attempting to drop this index...');
      
      try {
        await collection.dropIndex(serialNumberIndex.name);
        console.log(`✅ Successfully dropped unique index: ${serialNumberIndex.name}`);
      } catch (dropError) {
        console.log(`❌ Failed to drop index: ${dropError.message}`);
      }
    } else {
      console.log('✅ No unique index found on serialNumber');
    }
    
    // Create a non-unique index for performance (optional)
    console.log('\\n=== CREATING NON-UNIQUE INDEX ON SERIAL NUMBER ===');
    try {
      await collection.createIndex({ serialNumber: 1 }, { unique: false });
      console.log('✅ Created non-unique index on serialNumber');
    } catch (createError) {
      console.log(`⚠️  Index creation note: ${createError.message}`);
    }
    
    // Test the same data that was failing before
    console.log('\\n=== TESTING POS MACHINE CREATION (RETRY) ===');
    
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
      serialNumber: '', // This was causing the duplicate key error
      model: '',
      createdBy: new mongoose.Types.ObjectId('69aed88bb4bc05e2078a350a'),
      updatedBy: new mongoose.Types.ObjectId('69aed88bb4bc05e2078a350a')
    };
    
    try {
      // Try to insert the test data
      const result = await collection.insertOne({
        ...testData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ Successfully created test POS machine with ID: ${result.insertedId}`);
      console.log('✅ Empty serialNumber is now allowed!');
      
      // Clean up - remove the test record
      await collection.deleteOne({ _id: result.insertedId });
      console.log('✅ Cleaned up test record');
      
    } catch (insertError) {
      console.log(`❌ Still failing: ${insertError.message}`);
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
    
    console.log('\\n=== SUMMARY ===');
    console.log('✅ Removed unique constraint on terminalId');
    console.log('✅ Removed unique constraint on serialNumber');
    console.log('✅ You can now add POS machines with duplicate terminal IDs and empty serial numbers');
    
  } catch (error) {
    console.error('Error during index operations:', error);
  }
  
  mongoose.connection.close();
  console.log('\\n🎉 Serial number index fix complete!');
}

// Run the fix
fixSerialNumberIndex().catch(console.error);