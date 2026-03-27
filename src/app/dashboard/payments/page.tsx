'use client'
import { useState, useEffect } from 'react'
import { Plus, Download, Eye, Edit, Trash2, CreditCard } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'
import { FilterPanel, FilterButton } from '@/components/ui/filter-panel'
import { Search } from 'lucide-react'

interface Payment {
  _id: string
  paymentNumber: string
  date: string
  agentId: string
  agentName: string
  paymentMethod: 'cash' | 'bank' | 'upi' | 'card'
  amount: number
  description: string
  status: 'completed' | 'pending' | 'failed' | 'due'
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
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    paymentNumber: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    agentId: '',
    paymentMethod: 'cash' as 'cash' | 'bank' | 'upi' | 'card',
    bankAccount: '',
    amount: '',
    description: '',
    status: 'completed' as 'completed' | 'pending' | 'failed' | 'due',
  })

  const [agents, setAgents] = useState<{_id: string, name: string}[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})

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
          status: t.status || 'completed',
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
          status: formData.status,
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
        const err = await response.json()
        throw new Error(err.error || 'Failed to save payment')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save payment')
    }
  }

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setFormData({
      paymentNumber: payment.paymentNumber,
      date: format(new Date(payment.date), 'yyyy-MM-dd'),
      agentId: payment.agentId || '',
      paymentMethod: payment.paymentMethod,
      bankAccount: '',
      amount: payment.amount.toString(),
      description: payment.description,
      status: payment.status || 'completed',
    })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deletingPayment) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/transactions/${deletingPayment._id}`, { method: 'DELETE' })
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
    } finally {
      setDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({ 
      paymentNumber: '', 
      date: format(new Date(), 'yyyy-MM-dd'), 
      agentId: '', 
      paymentMethod: 'cash', 
      bankAccount: '', 
      amount: '', 
      description: '',
      status: 'completed',
    })
    setEditingPayment(null)
  }

  const openAddModal = () => {
    const id = `P${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2,4).toUpperCase()}`
    setFormData({ paymentNumber: id, date: format(new Date(), 'yyyy-MM-dd'), agentId: '', paymentMethod: 'cash', bankAccount: '', amount: '', description: '', status: 'completed' })
    setEditingPayment(null)
    setShowModal(true)
  }

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.agentName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBatchId = !filters.batchId || p.paymentNumber.toLowerCase().includes(filters.batchId.toLowerCase())
    const matchesAgent = !filters.agent || filters.agent === 'all' || p.agentId === filters.agent
    return matchesSearch && matchesBatchId && matchesAgent
  })

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length

  const filterFields = [
    { key: 'batchId', label: 'Batch ID', type: 'text' as const, placeholder: 'Filter by batch ID...' },
    { key: 'agent', label: 'Agent', type: 'select' as const, options: [
      { value: 'all', label: 'All Agents' },
      ...agents.map(a => ({ value: a._id, label: a.name }))
    ]},
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{t('payments')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('managePayments')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openAddModal}
            className="dubai-button inline-flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addPayment')}
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments..."
            className="form-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <FilterButton onClick={() => setShowFilter(true)} activeCount={activeFilterCount} />
      </div>

      <FilterPanel
        open={showFilter}
        onClose={() => setShowFilter(false)}
        fields={filterFields}
        values={filters}
        onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({})}
        activeCount={activeFilterCount}
      />

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
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {filteredPayments.map((payment) => (
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
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    {['Batch ID', t('date'), t('agent'), t('paymentMethod'), 'Status', t('amount'), t('description'), 'Created By', t('actions')].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPayments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {payment.paymentNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(payment.date), 'dd-MMM-yyyy')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {payment.agentName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          payment.paymentMethod === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                          payment.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                          payment.paymentMethod === 'upi' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                        }`}>
                          {payment.paymentMethod.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                          payment.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                          'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
                        }`}>
                          {payment.status === 'due' ? 'Due' : payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary">
                        AED {payment.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 max-w-[180px] truncate">
                        {payment.description}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        <div>{payment.createdBy?.name || 'System'}</div>
                        <div className="text-xs text-gray-400">{format(new Date(payment.createdAt || payment.date), 'dd-MMM HH:mm')}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
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
            <div className="modal-header">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {editingPayment ? 'Edit Payment' : t('addPayment')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {editingPayment ? 'Update payment details' : 'Fill in the payment details below'}
                </p>
              </div>
              <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="modal-close-btn">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Section: Reference */}
              <div className="form-section">
                <p className="form-section-title">Reference</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">{t('batchId')}</label>
                    <input type="text" required className="form-input bg-gray-100 dark:bg-gray-600/50 cursor-not-allowed" value={formData.paymentNumber} readOnly />
                  </div>
                  <DatePicker label={t('date')} required value={formData.date} onChange={(v) => setFormData({...formData, date: v})} />
                </div>
              </div>

              {/* Section: Payment Details */}
              <div className="form-section">
                <p className="form-section-title">Payment Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">{t('agent')}</label>
                    <select required className="form-select" value={formData.agentId} onChange={(e) => setFormData({...formData, agentId: e.target.value})}>
                      <option value="">Select {t('agent')}</option>
                      {agents.map(agent => <option key={agent._id} value={agent._id}>{agent.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">{t('paymentMethod')}</label>
                    <select className="form-select" value={formData.paymentMethod} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as any})}>
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">{t('amount')} (AED)</label>
                    <input type="number" placeholder="0.00" required className="form-input"
                      value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Payment Status</label>
                    <select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})}>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="due">Due</option>
                      <option value="failed">Failed</option>
                    </select>
                    {(formData.status === 'pending' || formData.status === 'failed' || formData.status === 'due') && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠ This payment will appear in Settlements for follow-up.</p>
                    )}
                  </div>
                  {formData.paymentMethod === 'bank' && (
                    <div>
                      <label className="form-label">Bank Account</label>
                      <input type="text" placeholder="Bank Account Number" className="form-input"
                        value={formData.bankAccount} onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="form-label">{t('description')}</label>
                  <textarea placeholder={t('description')} rows={3} className="form-input resize-none"
                    value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="btn-secondary w-full sm:w-auto">{t('cancel')}</button>
                <button type="submit"
                  disabled={!formData.paymentNumber.trim() || !formData.agentId || !formData.amount || !formData.date}
                  className="dubai-button w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={deleting}
              className="btn-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger disabled:opacity-50 inline-flex items-center gap-2"
            >
              {deleting ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Deleting...</> : 'Delete'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}