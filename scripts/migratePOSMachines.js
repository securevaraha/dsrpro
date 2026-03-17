const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function migratePOSMachines() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    return;
  }
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('posmachines');

    // Check if collection exists
    const collections = await db.listCollections({ name: 'posmachines' }).toArray();
    if (collections.length === 0) {
      console.log('POSMachines collection does not exist yet. Creating with new schema...');
      // Create collection with new schema
      await collection.createIndex({ terminalId: 1 }, { unique: true });
      await collection.createIndex({ assignedAgent: 1 });
      await collection.createIndex({ brand: 1 });
      await collection.createIndex({ segment: 1 });
      await collection.createIndex({ status: 1 });
      console.log('Created POSMachines collection with new indexes');
      return;
    }

    // Get existing indexes
    const indexes = await collection.indexes();
    console.log('Existing indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique })));

    // Drop the unique index on serialNumber if it exists
    const serialNumberIndex = indexes.find(idx => 
      idx.key && idx.key.serialNumber && idx.unique
    );

    if (serialNumberIndex) {
      console.log('Dropping unique index on serialNumber...');
      await collection.dropIndex(serialNumberIndex.name);
      console.log('Dropped unique index on serialNumber');
    }

    // Ensure terminalId has unique index
    const terminalIdIndex = indexes.find(idx => 
      idx.key && idx.key.terminalId
    );

    if (!terminalIdIndex) {
      console.log('Creating unique index on terminalId...');
      await collection.createIndex({ terminalId: 1 }, { unique: true });
      console.log('Created unique index on terminalId');
    } else if (!terminalIdIndex.unique) {
      console.log('Updating terminalId index to be unique...');
      await collection.dropIndex(terminalIdIndex.name);
      await collection.createIndex({ terminalId: 1 }, { unique: true });
      console.log('Updated terminalId index to be unique');
    }

    // Create other indexes if they don't exist
    const requiredIndexes = [
      { key: { assignedAgent: 1 }, name: 'assignedAgent_1' },
      { key: { brand: 1 }, name: 'brand_1' },
      { key: { segment: 1 }, name: 'segment_1' },
      { key: { status: 1 }, name: 'status_1' }
    ];

    for (const requiredIndex of requiredIndexes) {
      const existingIndex = indexes.find(idx => idx.name === requiredIndex.name);
      if (!existingIndex) {
        console.log(`Creating index: ${requiredIndex.name}`);
        await collection.createIndex(requiredIndex.key);
      }
    }

    // Update existing documents to ensure they have the required fields
    const updateResult = await collection.updateMany(
      {},
      {
        $set: {
          serialNumber: { $ifNull: ['$serialNumber', ''] },
          model: { $ifNull: ['$model', ''] }
        }
      }
    );

    console.log(`Updated ${updateResult.modifiedCount} documents`);

    // Get final indexes
    const finalIndexes = await collection.indexes();
    console.log('Final indexes:', finalIndexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique })));

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

// Run migration
migratePOSMachines();