import mongoose from 'mongoose';

// Clear any existing model to prevent conflicts
if (mongoose.models.POSMachine) {
  delete mongoose.models.POSMachine;
}

const POSMachineSchema = new mongoose.Schema({
  segment: { type: String, required: true, trim: true },
  brand: { 
    type: String, 
    required: true,
    enum: ['Network', 'RAKBank', 'Geidea', 'AFS', 'Other']
  },
  terminalId: { 
    type: String, 
    required: true, 
    trim: true,
    uppercase: true, // Convert to uppercase for consistency
    validate: {
      validator: function(v: string) {
        return /^[A-Z0-9]+$/.test(v); // Only alphanumeric characters
      },
      message: 'Terminal ID must contain only alphanumeric characters'
    }
  },
  merchantId: { type: String, required: true, trim: true },
  serialNumber: { type: String, required: false, default: '', trim: true },
  model: { type: String, required: false, default: '', trim: true },
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
  bankCharges: { type: Number, default: 0, min: 0 },
  vatPercentage: { type: Number, default: 5, min: 0, max: 100 },
  commissionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'maintenance'], 
    default: 'active' 
  },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { 
  timestamps: true,
  strict: false // Allow additional fields for backward compatibility
});

// Create indexes - removed unique constraint on terminalId to allow duplicates
POSMachineSchema.index({ terminalId: 1 }); // Non-unique index for performance
POSMachineSchema.index({ assignedAgent: 1 });
POSMachineSchema.index({ brand: 1 });
POSMachineSchema.index({ segment: 1 });
POSMachineSchema.index({ status: 1 });

const POSMachine = mongoose.models.POSMachine || mongoose.model('POSMachine', POSMachineSchema);

export default POSMachine;
