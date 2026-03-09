export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'vendor';
  companyName?: string;
  phone?: string;
  address?: string;
  bankDetails?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface Receipt {
  _id: string;
  receiptNumber: string;
  date: Date;
  paymentMethod: 'cash' | 'bank' | 'upi' | 'card';
  amount: number;
  description: string;
  document?: string;
  createdBy: string;
  createdAt: Date;
}

export interface Payment {
  _id: string;
  paymentNumber: string;
  date: Date;
  vendorId: string;
  paymentMethod: 'cash' | 'bank' | 'upi' | 'card';
  bankAccount?: string;
  amount: number;
  description: string;
  attachment?: string;
  createdBy: string;
  createdAt: Date;
}

export interface Vendor {
  _id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  bankDetails: string;
  status: 'active' | 'inactive';
  marginSetting?: number;
  bankCharges?: number;
  createdAt: Date;
}