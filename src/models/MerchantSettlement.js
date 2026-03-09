import mongoose from 'mongoose'

const merchantSettlementSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ccSales: {
    type: Number,
    required: true,
    default: 0
  },
  chargesPercent: {
    type: Number,
    default: 3.75
  },
  charges: {
    type: Number,
    default: 0
  },
  bankCharges: {
    type: Number,
    default: 0
  },
  vat: {
    type: Number,
    default: 0
  },
  netReceived: {
    type: Number,
    default: 0
  },
  toPay: {
    type: Number,
    default: 0
  },
  margin: {
    type: Number,
    default: 0
  },
  paid: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  bankSettlements: {
    nbf: { type: Number, default: 0 },
    rak: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'settled'],
    default: 'pending'
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

// Auto-calculate fields before saving
merchantSettlementSchema.pre('save', function(next) {
  // Calculate charges (3.75% of CC Sales)
  this.charges = (this.ccSales * this.chargesPercent) / 100
  
  // Calculate VAT (5% of charges in UAE)
  this.vat = this.charges * 0.05
  
  // Calculate net received
  this.netReceived = this.ccSales - (this.charges + this.bankCharges + this.vat)
  
  // Calculate amount to pay to merchant
  this.toPay = this.ccSales - this.charges - this.bankCharges
  
  // Calculate margin (profit)
  this.margin = this.charges - this.bankCharges - this.vat
  
  // Calculate balance
  this.balance = this.toPay - this.paid
  
  next()
})

export default mongoose.models.MerchantSettlement || mongoose.model('MerchantSettlement', merchantSettlementSchema)