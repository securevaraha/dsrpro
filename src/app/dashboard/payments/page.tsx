'use client'
import { useState, useEffect } from 'react'
import { Plus, Download, Eye, Edit, Trash2, CreditCard } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'

interface Payment {
  _id: string
  paymentNumber: string
  date: string
  vendorName: string
  paymentMethod: 'cash' | 'bank' | 'upi' | 'card'
  amount: number
  description: string
  createdBy?: { name: string }
  createdAt?: string
}

export default function Payments() {
  const { t } = useLanguage()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const [formData, setFormData] = useState({
    paymentNumber: '',
    date: format(new Date(), 'dd-MMM-yyyy'),
    vendorId: '',
    paymentMethod: 'cash' as 'cash' | 'bank' | 'upi' | 'card',
    bankAccount: '',
    amount: '',
    description: '',
  })

  const [vendors, setVendors] = useState<{_id: string, name: string}[]>([])

  useEffect(() => {
    fetchPayments()
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/users?role=vendor')
      if (response.ok) {
        const data = await response.json()
        setVendors(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
    }
  }

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transactions?type=payment')
      if (response.ok) {
        const data = await response.json()
        const formattedPayments = data.transactions.map((t: any) => ({
          _id: t._id,
          paymentNumber: t.transactionId,
          date: t.createdAt,
          vendorName: t.vendorId?.name || 'Unknown',
          paymentMethod: t.paymentMethod,
          amount: t.amount,
          description: t.description || 'Payment',
          createdBy: t.createdBy,
          createdAt: t.createdAt
        }))
        setPayments(formattedPayments)
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const method = editingPayment ? 'PUT' : 'POST'
      const url = editingPayment ? `/api/transactions/${editingPayment._id}` : '/api/transactions'
      
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          vendorId: formData.vendorId,
          amount: parseFloat(formData.amount),
          paymentMethod: formData.paymentMethod,
          description: formData.description,
          metadata: {
            paymentNumber: formData.paymentNumber,
            bankAccount: formData.bankAccount
          }
        })
      })
      
      if (response.ok) {
        toast.success(editingPayment ? 'Payment updated successfully' : 'Payment added successfully')
        setShowModal(false)
        resetForm()
        fetchPayments()
      } else {
        throw new Error('Failed to save payment')
      }
    } catch (error) {
      toast.error('Failed to save payment')
    }
  }

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setFormData({
      paymentNumber: payment.paymentNumber,
      date: format(new Date(payment.date), 'dd-MMM-yyyy'),
      vendorId: '1',
      paymentMethod: payment.paymentMethod,
      bankAccount: '',
      amount: payment.amount.toString(),
      description: payment.description
    })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deletingPayment) return
    
    try {
      const response = await fetch(`/api/transactions/${deletingPayment._id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Payment deleted successfully')
        setShowDeleteDialog(false)
        setDeletingPayment(null)
        fetchPayments()
      } else {
        throw new Error('Failed to delete payment')
      }
    } catch (error) {
      toast.error('Failed to delete payment')
    }
  }

  const resetForm = () => {
    setFormData({ 
      paymentNumber: '', 
      date: format(new Date(), 'dd-MMM-yyyy'), 
      vendorId: '', 
      paymentMethod: 'cash', 
      bankAccount: '', 
      amount: '', 
      description: '' 
    })
    setEditingPayment(null)
  }

  const generatePaymentNumber = () => {
    const nextNumber = `P${String(payments.length + 1).padStart(3, '0')}`
    setFormData({...formData, paymentNumber: nextNumber})
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl md:text-2xl font-semibold text-text dark:text-text-dark">{t('payments')}</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{t('managePayments')}</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4 sm:flex-none flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              generatePaymentNumber()
              setShowModal(true)
            }}
            className="dubai-button inline-flex items-center justify-center w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addPayment')}
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            {loading ? (
              <TableSkeleton rows={5} columns={7} />
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-600 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                <thead className="table-header">
                  <tr>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('paymentId')}</th>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('date')}</th>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('vendor')}</th>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('paymentMethod')}</th>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('amount')}</th>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('description')}</th>
                    <th className="table-cell font-medium uppercase tracking-wider">Created By</th>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                            <CreditCard className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                          </div>
                          <h3 className="text-lg font-medium text-text dark:text-text-dark mb-2">
                            {t('noPaymentsFound')}
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 mb-4">
                            {t('noPaymentsDescription')}
                          </p>
                          <button
                            onClick={() => {
                              generatePaymentNumber()
                              setShowModal(true)
                            }}
                            className="dubai-button"
                          >
                            {t('addFirstPayment')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment._id} className="table-row">
                        <td className="table-cell font-medium">
                          {payment.paymentNumber}
                        </td>
                        <td className="table-cell">
                          {format(new Date(payment.date), 'dd-MMM-yyyy')}
                        </td>
                        <td className="table-cell">
                          {payment.vendorName}
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.paymentMethod === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            payment.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            payment.paymentMethod === 'upi' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {payment.paymentMethod.toUpperCase()}
                          </span>
                        </td>
                        <td className="table-cell font-medium">
                          AED {payment.amount.toLocaleString()}
                        </td>
                        <td className="table-cell">
                          {payment.description}
                        </td>
                        <td className="table-cell text-xs text-gray-500 dark:text-gray-400">
                          <div>{payment.createdBy?.name || 'System'}</div>
                          <div>{format(new Date(payment.createdAt || payment.date), 'dd-MMM HH:mm')}</div>
                        </td>
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            <button 
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors" 
                              title={t('view')}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => {
                                const { exportToExcel, reportColumns } = require('@/lib/excelExport')
                                exportToExcel({
                                  filename: 'payments_report',
                                  sheetName: 'Payments',
                                  columns: reportColumns.payments(t),
                                  data: payments.map(p => ({
                                    ...p,
                                    date: format(new Date(p.date), 'dd-MMM-yyyy'),
                                    amount: `AED ${p.amount.toLocaleString()}`
                                  })),
                                  title: t('paymentsReport'),
                                  isRTL: false
                                })
                              }}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors" 
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleEdit(payment)}
                              className="text-primary hover:text-accent transition-colors" 
                              title={t('edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setDeletingPayment(payment)
                                setShowDeleteDialog(true)
                              }}
                              className="text-danger hover:text-red-700 transition-colors" 
                              title={t('delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Payment Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md mx-4 sm:mx-auto">
            <h3 className="text-lg font-bold text-text dark:text-text-dark mb-4">
              {editingPayment ? 'Edit Payment' : t('addPayment')}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('paymentId')}</label>
                <input
                  type="text"
                  placeholder={t('paymentId')}
                  required
                  className="form-input bg-gray-100 dark:bg-gray-600"
                  value={formData.paymentNumber}
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('date')}</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.date}
                  placeholder="dd-MMM-yyyy"
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('vendor')}</label>
                <select
                  required
                  className="form-select"
                  value={formData.vendorId}
                  onChange={(e) => setFormData({...formData, vendorId: e.target.value})}
                >
                  <option value="">Select {t('vendor')}</option>
                  {vendors.map(vendor => (
                    <option key={vendor._id} value={vendor._id}>{vendor.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('paymentMethod')}</label>
                <select
                  className="form-select"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as any})}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
              {formData.paymentMethod === 'bank' && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bank Account</label>
                  <input
                    type="text"
                    placeholder="Bank Account"
                    className="form-input"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('amount')}</label>
                <input
                  type="number"
                  placeholder={t('amount')}
                  required
                  className="form-input"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('description')}</label>
                <textarea
                  placeholder={t('description')}
                  required
                  className="form-input min-h-[80px]"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="btn-secondary w-full sm:w-auto"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="dubai-button w-full sm:w-auto"
                >
                  {editingPayment ? 'Update Payment' : t('addPayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete payment {deletingPayment?.paymentNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => {
                setShowDeleteDialog(false)
                setDeletingPayment(null)
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-card hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}