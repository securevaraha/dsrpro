import mongoose from 'mongoose';

const POSMachineSchema = new mongoose.Schema({
  terminalId: { type: String, required: true, unique: true, trim: true },
  merchantId: { type: String, required: true, trim: true },
  serialNumber: { type: String, required: true, unique: true, trim: true },
  model: { type: String, default: '' },
  brand: { 
    type: String, 
    required: true,
    enum: ['Network', 'RAKBank', 'Geidea', 'AFS', 'Other']
  },
  deviceType: { 
    type: String, 
    required: true,
    enum: ['android_pos', 'traditional_pos']
  },
  assignedAgent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null
  },
  location: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'maintenance'], 
    default: 'active' 
  },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

POSMachineSchema.index({ assignedAgent: 1 });
POSMachineSchema.index({ brand: 1 });
POSMachineSchema.index({ status: 1 });

export default mongoose.models.POSMachine || mongoose.model('POSMachine', POSMachineSchema);
