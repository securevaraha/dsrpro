import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true,
    maxlength: 254,
  },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'agent'], default: 'agent' },
  companyName: { type: String, trim: true, maxlength: 200 },
  phone: { type: String, trim: true, maxlength: 20 },
  address: String,
  bankDetails: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

UserSchema.index({ role: 1, status: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);