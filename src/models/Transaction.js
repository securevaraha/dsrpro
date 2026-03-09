import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  posId: {
    type: String,
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  commission: {
    type: Number,
    default: 0
  },
  agentCommission: {
    type: Number,
    default: 0
  },
  vendorCommission: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: ['sale', 'refund', 'void'],
    default: 'sale'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank'],
    required: true
  },
  description: String,
  metadata: {
    cardType: String,
    bankName: String,
    upiId: String,
    receiptNumber: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
})

export default mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema)