import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'upi', 'card'], required: true },
  bankAccount: String,
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  attachment: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);