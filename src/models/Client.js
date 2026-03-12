import mongoose from 'mongoose'

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  businessType: {
    type: String,
    enum: ['retail', 'restaurant', 'service', 'other'],
    default: 'retail'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  commissionRate: {
    type: Number,
    default: 2.5
  }
}, {
  timestamps: true
})

export default mongoose.models.Client || mongoose.model('Client', clientSchema)