const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Prefer .env.local, then fall back to .env.
dotenv.config({ path: '.env.local' });
dotenv.config();

const SegmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Segment = mongoose.models.Segment || mongoose.model('Segment', SegmentSchema);

async function seedSegments() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const operations = [];
    for (let i = 1; i <= 100; i += 1) {
      const number = String(i).padStart(3, '0');
      operations.push({
        updateOne: {
          filter: { name: `Segment ${number}` },
          update: {
            $set: {
              description: `Test segment ${number}`,
              isActive: true,
            },
          },
          upsert: true,
        },
      });
    }

    const result = await Segment.bulkWrite(operations, { ordered: false });

    const totalSegments = await Segment.countDocuments();
    console.log('Seed completed');
    console.log(`Inserted: ${result.upsertedCount || 0}`);
    console.log(`Updated: ${result.modifiedCount || 0}`);
    console.log(`Total segments in DB: ${totalSegments}`);
  } catch (error) {
    console.error('Failed to seed segments:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedSegments();
