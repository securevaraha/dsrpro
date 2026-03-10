import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  actionUrl: String,
  actionType: {
    type: String,
    enum: ['none', 'account_approval'],
    default: 'none'
  },
  actionData: {
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetRole: String,
    targetName: String,
    targetEmail: String,
  },
  actionTaken: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  metadata: {
    transactionId: String,
    userId: String,
    amount: Number
  }
}, {
  timestamps: true
})

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema)