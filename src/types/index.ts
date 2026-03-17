export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
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
  agentId: string;
  paymentMethod: 'cash' | 'bank' | 'upi' | 'card';
  bankAccount?: string;
  amount: number;
  description: string;
  attachment?: string;
  createdBy: string;
  createdAt: Date;
}

export interface POSMachine {
  _id: string;
  segment: string;
  terminalId: string;
  merchantId: string;
  serialNumber: string;
  model: string;
  brand: 'Network' | 'RAKBank' | 'Geidea' | 'AFS' | 'Other';
  deviceType: 'android_pos' | 'traditional_pos';
  assignedAgent: string | { _id: string; name: string; email: string; companyName?: string } | null;
  location: string;
  bankCharges: number;
  vatPercentage: number;
  commissionPercentage: number;
  status: 'active' | 'inactive' | 'maintenance';
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}