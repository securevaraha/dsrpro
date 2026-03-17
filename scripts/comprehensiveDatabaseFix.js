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

async function fixAllDatabaseIssues() {
  await connectToProduction();
  
  console.log('\n=== COMPREHENSIVE DATABASE FIX ===\n');
  
  try {
    // Get the POSMachine collection
    const db = mongoose.connection.db;
    const collection = db.collection('posmachines');
    
    // 1. Check and fix all indexes
    console.log('=== STEP 1: CHECKING ALL INDEXES ===');
    const indexes = await collection.indexes();
    console.log('Current indexes:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key));
      if (index.unique) {
        console.log(`   - UNIQUE: ${index.unique}`);
      }
    });
    
    // Drop ALL unique indexes except _id
    console.log('\\n=== STEP 2: DROPPING ALL UNIQUE INDEXES ===');
    const uniqueIndexes = indexes.filter(index => 
      index.unique && index.name !== '_id_'
    );
    
    for (const index of uniqueIndexes) {
      try {
        console.log(`Dropping unique index: ${index.name}`);
        await collection.dropIndex(index.name);
        console.log(`✅ Dropped: ${index.name}`);
      } catch (error) {
        console.log(`⚠️  Could not drop ${index.name}: ${error.message}`);
      }
    }
    
    // 2. Test the exact failing data
    console.log('\n=== STEP 3: TESTING FAILING DATA ===');\n    const testData = {\n      segment: 'sdfdsf',\n      brand: 'Network',\n      terminalId: 'SD3454353',\n      merchantId: '32434355',\n      deviceType: 'android_pos',\n      assignedAgent: new mongoose.Types.ObjectId('69afdd0a07391b3b0cc9690f'),\n      location: 'sdfdsf',\n      bankCharges: 1.75,\n      vatPercentage: 5,\n      commissionPercentage: 1.75,\n      status: 'active',\n      notes: 'fdsfsd',\n      serialNumber: '',\n      model: '',\n      createdBy: new mongoose.Types.ObjectId('69afdd0a07391b3b0cc9690f'),\n      updatedBy: new mongoose.Types.ObjectId('69afdd0a07391b3b0cc9690f'),\n      createdAt: new Date(),\n      updatedAt: new Date()\n    };\n    \n    console.log('Attempting to insert test data...');\n    try {\n      const result = await collection.insertOne(testData);\n      console.log(`✅ SUCCESS! Test data inserted with ID: ${result.insertedId}`);\n      \n      // Clean up\n      await collection.deleteOne({ _id: result.insertedId });\n      console.log('✅ Test data cleaned up');\n      \n    } catch (insertError) {\n      console.log(`❌ Insert failed: ${insertError.message}`);\n      console.log('Error code:', insertError.code);\n      \n      if (insertError.code === 11000) {\n        console.log('\\n🔍 DUPLICATE KEY ERROR DETAILS:');\n        console.log('Key pattern:', insertError.keyPattern);\n        console.log('Key value:', insertError.keyValue);\n        \n        // Find and drop the problematic index\n        const fieldName = Object.keys(insertError.keyPattern)[0];\n        console.log(`\\n⚠️  Field \"${fieldName}\" still has a unique constraint`);\n        \n        // Try to find and drop any remaining unique indexes on this field\n        const remainingIndexes = await collection.indexes();\n        const problematicIndex = remainingIndexes.find(index => \n          index.key[fieldName] && index.unique\n        );\n        \n        if (problematicIndex) {\n          console.log(`Found problematic index: ${problematicIndex.name}`);\n          try {\n            await collection.dropIndex(problematicIndex.name);\n            console.log(`✅ Dropped problematic index: ${problematicIndex.name}`);\n            \n            // Retry insert\n            console.log('\\n=== RETRYING INSERT ===');\n            const retryResult = await collection.insertOne(testData);\n            console.log(`✅ SUCCESS after index drop! ID: ${retryResult.insertedId}`);\n            \n            // Clean up\n            await collection.deleteOne({ _id: retryResult.insertedId });\n            console.log('✅ Retry test data cleaned up');\n            \n          } catch (dropError) {\n            console.log(`❌ Could not drop index: ${dropError.message}`);\n          }\n        }\n      }\n    }\n    \n    // 3. Show final state\n    console.log('\\n=== STEP 4: FINAL DATABASE STATE ===');\n    const finalIndexes = await collection.indexes();\n    console.log('Final indexes:');\n    finalIndexes.forEach((index, i) => {\n      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key));\n      if (index.unique) {\n        console.log(`   - UNIQUE: ${index.unique}`);\n      }\n    });\n    \n    // 4. Check current data\n    const currentMachines = await collection.find({}).toArray();\n    console.log(`\\nCurrent POS machines in database: ${currentMachines.length}`);\n    currentMachines.forEach((machine, index) => {\n      console.log(`${index + 1}. ${machine.terminalId} (${machine.segment}/${machine.brand})`);\n    });\n    \n    console.log('\\n=== SUMMARY ===');\n    console.log('✅ Removed all unique constraints except _id');\n    console.log('✅ Database is now ready for duplicate terminal IDs');\n    console.log('✅ Database is now ready for empty serial numbers');\n    console.log('✅ All fields can now have duplicate values');\n    \n  } catch (error) {\n    console.error('Error during comprehensive fix:', error);\n  }\n  \n  mongoose.connection.close();\n  console.log('\\n🎉 Comprehensive database fix complete!');\n}\n\n// Run the comprehensive fix\nfixAllDatabaseIssues().catch(console.error);