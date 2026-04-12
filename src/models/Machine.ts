import mongoose from 'mongoose';

// Clear cached model to pick up schema changes
if (mongoose.models.Machine) {
  delete mongoose.models.Machine
}

const MachineSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.Machine || mongoose.model('Machine', MachineSchema);