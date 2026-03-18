import mongoose from 'mongoose';

const ReceiptSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'upi', 'card'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  document: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.models.Receipt || mongoose.model('Receipt', ReceiptSchema);