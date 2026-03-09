import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  companyName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  bankDetails: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  marginSetting: { type: Number, default: 0 },
  bankCharges: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);