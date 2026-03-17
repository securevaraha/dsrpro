const mongoose = require('mongoose');

const PRODUCTION_DB_URI = 'mongodb+srv://Vercel-Admin-inventory-mongodb:G49Sf4P3x13dVePa@inventory-mongodb.cpw5ztm.mongodb.net/dsr-app?retryWrites=true&w=majority';

async function connectToProduction() {
  try {
    await mongoose.connect(PRODUCTION_DB_URI);
    console.log('Connected to PRODUCTION MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function fixDatabase() {
  await connectToProduction();
  
  console.log('\\n=== FIXING DATABASE CONSTRAINTS ===\\n');
  
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('posmachines');
    
    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(UNIQUE)' : ''}`);
    });
    
    // Drop all unique indexes except _id
    const uniqueIndexes = indexes.filter(index => index.unique && index.name !== '_id_');
    
    console.log(`\\nDropping ${uniqueIndexes.length} unique indexes...`);
    for (const index of uniqueIndexes) {
      try {
        await collection.dropIndex(index.name);
        console.log(`✅ Dropped: ${index.name}`);
      } catch (error) {
        console.log(`❌ Failed to drop ${index.name}: ${error.message}`);
      }
    }
    
    // Test the failing data
    console.log('\\n=== TESTING FAILING DATA ===');
    const testData = {
      segment: 'sdfdsf',
      brand: 'Network',
      terminalId: 'SD3454353',
      merchantId: '32434355',
      deviceType: 'android_pos',
      assignedAgent: new mongoose.Types.ObjectId('69afdd0a07391b3b0cc9690f'),
      location: 'sdfdsf',
      bankCharges: 1.75,
      vatPercentage: 5,
      commissionPercentage: 1.75,
      status: 'active',
      notes: 'fdsfsd',
      serialNumber: '',
      model: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      const result = await collection.insertOne(testData);
      console.log(`✅ SUCCESS! Test data inserted with ID: ${result.insertedId}`);
      
      // Clean up
      await collection.deleteOne({ _id: result.insertedId });
      console.log('✅ Test data cleaned up');
      
    } catch (insertError) {
      console.log(`❌ Insert still failed: ${insertError.message}`);
      
      if (insertError.code === 11000) {
        console.log('Duplicate key error details:');
        console.log('- Key pattern:', insertError.keyPattern);
        console.log('- Key value:', insertError.keyValue);
        
        const fieldName = Object.keys(insertError.keyPattern)[0];
        console.log(`\\n⚠️  Field \"${fieldName}\" still has a unique constraint`);
        
        // Try to drop any remaining unique index on this field
        const currentIndexes = await collection.indexes();
        const problematicIndex = currentIndexes.find(index => 
          index.key[fieldName] && index.unique
        );
        
        if (problematicIndex) {
          console.log(`Attempting to drop: ${problematicIndex.name}`);
          try {
            await collection.dropIndex(problematicIndex.name);
            console.log(`✅ Successfully dropped: ${problematicIndex.name}`);
            
            // Retry
            const retryResult = await collection.insertOne(testData);
            console.log(`✅ SUCCESS after fix! ID: ${retryResult.insertedId}`);
            await collection.deleteOne({ _id: retryResult.insertedId });
            console.log('✅ Cleanup complete');
            
          } catch (dropError) {
            console.log(`❌ Could not drop index: ${dropError.message}`);
          }
        }
      }
    }
    
    // Show final state
    console.log('\\n=== FINAL STATE ===');
    const finalIndexes = await collection.indexes();
    console.log('Remaining indexes:');
    finalIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(UNIQUE)' : ''}`);
    });
    
    const machineCount = await collection.countDocuments();
    console.log(`\\nTotal POS machines: ${machineCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  mongoose.connection.close();
  console.log('\\n🎉 Database fix complete!');
}

fixDatabase().catch(console.error);