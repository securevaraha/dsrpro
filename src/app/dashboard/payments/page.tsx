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
  agentId: string
  agentName: string
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
    agentId: '',
    paymentMethod: 'cash' as 'cash' | 'bank' | 'upi' | 'card',
    bankAccount: '',
    amount: '',
    description: '',
  })

  const [agents, setAgents] = useState<{_id: string, name: string}[]>([])

  useEffect(() => {
    fetchPayments()
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/users?role=agent')
      if (response.ok) {
        const data = await response.json()
        setAgents(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
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
          agentId: t.agentId?._id || '',
          agentName: t.agentId?.name || 'Unknown',
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
      const isEditing = !!editingPayment
      const url = isEditing ? `/api/transactions/${editingPayment._id}` : '/api/transactions'
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          agentId: formData.agentId,
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
      agentId: payment.agentId || '',
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
      agentId: '', 
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{t('payments')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('managePayments')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              generatePaymentNumber()
              setShowModal(true)
            }}
            className="dubai-button inline-flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addPayment')}
          </button>
        </div>
      </div>

      {/* Payments */}
      <div className="mt-6">
        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : payments.length === 0 ? (
          <div className="dubai-card text-center py-12">
            <CreditCard className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
              {t('noPaymentsFound')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {payments.map((payment) => (
                <div key={payment._id} className="dubai-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{payment.paymentNumber}</span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                      payment.paymentMethod === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                      payment.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                      payment.paymentMethod === 'upi' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                    }`}>
                      {payment.paymentMethod.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{payment.agentName}</span>
                    <span className="text-base font-semibold text-gray-900 dark:text-white">AED {payment.amount.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{payment.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{format(new Date(payment.date), 'dd-MMM-yyyy')}</span>
                    <span className="text-xs text-gray-400">{payment.createdBy?.name || 'System'}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(payment)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
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
                      className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingPayment(payment)
                        setShowDeleteDialog(true)
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto dubai-card !p-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('paymentId')}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('date')}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('agent')}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('paymentMethod')}</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('amount')}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('description')}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created By</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {payment.paymentNumber}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(payment.date), 'dd-MMM-yyyy')}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {payment.agentName}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          payment.paymentMethod === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                          payment.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                          payment.paymentMethod === 'upi' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                        }`}>
                          {payment.paymentMethod.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-right text-gray-900 dark:text-gray-100">
                        AED {payment.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                        {payment.description}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                        <div>{payment.createdBy?.name || 'System'}</div>
                        <div>{format(new Date(payment.createdAt || payment.date), 'dd-MMM HH:mm')}</div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center text-sm">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleEdit(payment)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title={t('edit')}
                          >
                            <Edit className="h-4 w-4" />
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
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingPayment(payment)
                              setShowDeleteDialog(true)
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Payment Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {editingPayment ? 'Edit Payment' : t('addPayment')}
              </h3>
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm() }}
                className="ml-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-8">
              {editingPayment ? 'Update payment details below' : 'Fill in the payment details below'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <div>
                  <label className="form-label">{t('paymentId')}</label>
                  <input
                    type="text"
                    required
                    className="form-input bg-gray-50 dark:bg-gray-600"
                    value={formData.paymentNumber}
                    readOnly
                  />
                </div>
                <div>
                  <label className="form-label">{t('date')}</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.date}
                    placeholder="dd-MMM-yyyy"
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <div>
                  <label className="form-label">{t('agent')}</label>
                  <select
                    required
                    className="form-select"
                    value={formData.agentId}
                    onChange={(e) => setFormData({...formData, agentId: e.target.value})}
                  >
                    <option value="">Select {t('agent')}</option>
                    {agents.map(agent => (
                      <option key={agent._id} value={agent._id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">{t('paymentMethod')}</label>
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
                <div>
                  <label className="form-label">{t('amount')}</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    required
                    className="form-input"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
              </div>
              {formData.paymentMethod === 'bank' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="form-label">Bank Account</label>
                  <input
                    type="text"
                    placeholder="Bank Account Number"
                    className="form-input"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                  />
                </div>
              </div>
              )}
              <div>
                <label className="form-label">{t('description')}</label>
                <textarea
                  placeholder={t('description')}
                  rows={4}
                  className="form-input resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-5 border-t border-gray-200 dark:border-gray-700 mt-2">
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
          <div className="flex justify-end gap-2 mt-4">
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
              className="btn-danger"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}