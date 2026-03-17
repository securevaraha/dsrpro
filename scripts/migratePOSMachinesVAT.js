const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function migratePOSMachinesVAT() {
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
      console.log('POSMachines collection does not exist yet.');
      return;
    }

    // Update all existing documents to add vatPercentage field if missing
    const updateResult = await collection.updateMany(
      { vatPercentage: { $exists: false } },
      { $set: { vatPercentage: 5 } }
    );

    console.log(`Updated ${updateResult.modifiedCount} documents with vatPercentage field`);

    // Also ensure serialNumber and model are not required for existing documents
    const updateResult2 = await collection.updateMany(
      { 
        $or: [
          { serialNumber: { $exists: false } },
          { model: { $exists: false } }
        ]
      },
      { 
        $set: { 
          serialNumber: { $ifNull: ['$serialNumber', ''] },
          model: { $ifNull: ['$model', ''] }
        }
      }
    );

    console.log(`Updated ${updateResult2.modifiedCount} documents with serialNumber/model fields`);

    console.log('VAT migration completed successfully!');

  } catch (error) {
    console.error('VAT migration failed:', error);
  } finally {
    await client.close();
  }
}

// Run migration
migratePOSMachinesVAT();