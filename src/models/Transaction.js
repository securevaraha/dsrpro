import mongoose from 'mongoose'

// Clear cached model to pick up schema changes
if (mongoose.models.Transaction) {
  delete mongoose.models.Transaction
}

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  posId: {
    type: String,
    required: false
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: false
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
  type: {
    type: String,
    enum: ['sale', 'refund', 'void', 'payment', 'receipt'],
    default: 'sale'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'due'],
    default: 'pending'
  },
  posMachine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POSMachine',
    required: false
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank'],
    required: false
  },
  description: String,
  paidAmount: { type: Number, default: 0 },
  settlementAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  attachments: [{
    type: String,
    required: false
  }],
  date: {
    type: Date,
    required: false
  },
  metadata: {
    cardType: String,
    bankName: String,
    upiId: String,
    receiptNumber: String,
    paymentNumber: String,
    source: String,
    outstandingDueBefore: Number,
    outstandingDueAfter: Number
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

transactionSchema.index({ agentId: 1, createdAt: -1 })
transactionSchema.index({ status: 1, type: 1, createdAt: -1 })
transactionSchema.index({ createdAt: -1 })

export default mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema)