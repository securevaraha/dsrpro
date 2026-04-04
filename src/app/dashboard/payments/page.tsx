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
  })

  const [agents, setAgents] = useState<{_id: string, name: string}[]>([])
  const [agentDueMap, setAgentDueMap] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})  
  const [agentBalance, setAgentBalance] = useState<{ totalToPay: number; totalNetReceived: number; totalPaid: number; totalDue: number } | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  useEffect(() => {
    fetchPayments()
    fetchAgents()
  }, [])

  const fetchAgentDueMap = async (agentList: {_id: string, name: string}[]) => {
    const entries = await Promise.all(agentList.map(async (agent) => {
      try {
        const res = await fetch(`/api/payments/agent-balance?agentId=${agent._id}`)
        if (!res.ok) return [agent._id, 0] as const
        const data = await res.json()
        return [agent._id, Number(data.totalDue || 0)] as const
      } catch {
        return [agent._id, 0] as const
      }
    }))

    const dueMap = entries.reduce((acc, [id, due]) => {
      acc[id] = due
      return acc
    }, {} as Record<string, number>)

    setAgentDueMap(dueMap)
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/users?role=agent')
      if (response.ok) {
        const data = await response.json()
        const users = data.users || []
        setAgents(users)
        await fetchAgentDueMap(users)
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transactions?type=payment&limit=500')
      if (response.ok) {
        const data = await response.json()
        const formattedPayments = data.transactions.map((t: any) => ({
          _id: t._id,
          paymentNumber: t.transactionId,
          date: t.date || t.createdAt,
          agentId: t.agentId?._id || '',
          agentName: t.agentId?.name || 'Unknown',
          paymentMethod: t.paymentMethod,
          amount: t.amount,
          description: t.description || 'Payment',
          status: t.status || 'completed',
          createdBy: t.createdBy,
          createdAt: t.createdAt
        })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
      
      // Use smart send endpoint for new payments (distributes across receipts)
      if (!isEditing) {
        const payAmount = parseFloat(formData.amount)
        const totalDue = agentBalance?.totalDue ?? 0
        if (!Number.isFinite(payAmount) || payAmount <= 0) {
          throw new Error('Pay Amount must be greater than 0')
        }
        if (totalDue <= 0) {
          throw new Error('No due amount available for this agent')
        }
        if (payAmount > totalDue) {
          throw new Error(`Pay Amount cannot exceed total due (AED ${totalDue.toFixed(2)})`)
        }

        const sendRes = await fetch('/api/payments/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: formData.agentId,
            amount: payAmount,
            paymentMethod: formData.paymentMethod,
            description: formData.description,
            date: formData.date,
          })
        })
        if (sendRes.ok) {
          const sendData = await sendRes.json()
          if ((sendData.unappliedAmount || 0) > 0.01) {
            toast.success(`Applied AED ${sendData.appliedAmount.toFixed(2)}. AED ${sendData.unappliedAmount.toFixed(2)} was not applied (no pending due). Remaining due: AED ${sendData.outstandingDueAfter.toFixed(2)}`)
          } else if ((sendData.outstandingDueAfter || 0) > 0.01) {
            toast.success(`Payment sent. Remaining due: AED ${sendData.outstandingDueAfter.toFixed(2)}`)
          } else {
            toast.success('Payment sent successfully. All dues are cleared.')
          }
          setShowModal(false)
          resetForm()
          fetchAgentBalance(formData.agentId)
          fetchAgents()
          fetchPayments()
        } else {
          const err = await sendRes.json()
          throw new Error(err.error || 'Failed to send payment')
        }
        return
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          agentId: formData.agentId,
          amount: parseFloat(formData.amount),
          date: formData.date,
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
    })
    setEditingPayment(null)
  }

  const fetchAgentBalance = async (agentId: string) => {
    if (!agentId) { setAgentBalance(null); return }
    setBalanceLoading(true)
    try {
      const res = await fetch(`/api/payments/agent-balance?agentId=${agentId}`)
      if (res.ok) setAgentBalance(await res.json())
    } catch {}
    finally { setBalanceLoading(false) }
  }

  const openAddModal = () => {
    const id = `P${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2,4).toUpperCase()}`
    setFormData({ paymentNumber: id, date: format(new Date(), 'yyyy-MM-dd'), agentId: '', paymentMethod: 'cash', bankAccount: '', amount: '', description: '' })
    setEditingPayment(null)
    setAgentBalance(null)
    setShowModal(true)
  }

  const enteredPayAmount = parseFloat(formData.amount)
  const safePayAmount = Number.isFinite(enteredPayAmount) ? Math.max(0, enteredPayAmount) : 0
  const totalDueAmount = agentBalance?.totalDue ?? 0
  const computedDueAfterPay = Math.max(0, totalDueAmount - safePayAmount)
  const payableAgents = editingPayment
    ? agents
    : agents.filter((a) => (agentDueMap[a._id] || 0) > 0.001)

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.agentName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBatchId = !filters.batchId || p.paymentNumber.toLowerCase().includes(filters.batchId.toLowerCase())
    const matchesAgent = !filters.agent || filters.agent === 'all' || p.agentId === filters.agent
    const pDate = new Date(p.date)
    const matchesFrom = !filters.dateFrom || pDate >= new Date(filters.dateFrom)
    const matchesTo = !filters.dateTo || pDate <= new Date(filters.dateTo + 'T23:59:59')
    return matchesSearch && matchesBatchId && matchesAgent && matchesFrom && matchesTo
  })

  const grandTotal = filteredPayments.reduce((s, p) => s + p.amount, 0)

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length

  const filterFields = [
    { key: 'batchId', label: 'Batch ID', type: 'text' as const, placeholder: 'Filter by batch ID...' },
    { key: 'agent', label: 'Agent', type: 'select' as const, options: [
      { value: 'all', label: 'All Agents' },
      ...agents.map(a => ({ value: a._id, label: a.name }))
    ]},
    { key: 'dateFrom', label: 'Date From', type: 'date' as const },
    { key: 'dateTo', label: 'Date To', type: 'date' as const },
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
            onClick={() => {
              const { exportToExcel, reportColumns } = require('@/lib/excelExport')
              exportToExcel({
                filename: 'payments_report',
                sheetName: 'Payments',
                columns: reportColumns.payments(t),
                data: [
                  ...filteredPayments.map(p => ({
                    ...p,
                    date: format(new Date(p.date), 'dd-MMM-yyyy'),
                    paymentMethod: p.paymentMethod.toUpperCase(),
                    status: p.status === 'due' ? 'Due' : p.status.charAt(0).toUpperCase() + p.status.slice(1),
                    amount: `AED ${p.amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    createdByDate: `${p.createdBy?.name || 'System'} | ${format(new Date(p.createdAt || p.date), 'dd-MMM-yyyy HH:mm')}`
                  })),
                  {
                    paymentNumber: `Grand Total (${filteredPayments.length} records)`,
                    amount: `AED ${grandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  }
                ],
                title: t('paymentsReport'),
                grandTotals: {
                  enabled: true,
                  summary: `Grand Total: AED ${grandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                },
                isRTL: false
              })
            }}
            className="btn-secondary inline-flex items-center justify-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
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
              <div className="dubai-card p-4 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Grand Total ({filteredPayments.length} records)</span>
                  <span className="text-base font-bold text-primary">AED {grandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto dubai-card !p-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    {['Batch ID', t('agent'), t('date'), t('paymentMethod'), 'Status', t('amount'), 'Created By / Date', t('description'), t('actions')].map((h) => (
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
                        {payment.agentName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(payment.date), 'dd-MMM-yyyy')}
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        <div className="meta-compact">
                          <div className="meta-compact-name">{payment.createdBy?.name || 'System'}</div>
                          <div className="meta-compact-date">{format(new Date(payment.createdAt || payment.date), 'dd-MMM-yyyy HH:mm')}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 max-w-[180px] truncate">
                        {payment.description}
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
                <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Grand Total ({filteredPayments.length} records)</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-primary">AED {grandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
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
                    <select required className="form-select" value={formData.agentId} onChange={(e) => {
                      setFormData({...formData, agentId: e.target.value})
                      if (!editingPayment) fetchAgentBalance(e.target.value)
                    }}>
                      <option value="">Select {t('agent')}</option>
                      {payableAgents.map(agent => <option key={agent._id} value={agent._id}>{agent.name}</option>)}
                    </select>
                    {!editingPayment && payableAgents.length === 0 && (
                      <p className="text-xs text-amber-500 mt-1">No agents have pending due amount.</p>
                    )}
                    {!editingPayment && agentBalance && (
                      <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs space-y-0.5">
                        <div className="flex justify-between"><span className="text-gray-500">Net Received (Admin):</span><span className="font-semibold text-emerald-600">AED {agentBalance.totalNetReceived.toFixed(2)}</span></div>
                        <div className="flex justify-between border-t border-blue-100 dark:border-blue-800 pt-0.5 mt-0.5"><span className="text-gray-500">Total to Pay Agent:</span><span className="font-semibold text-gray-800 dark:text-gray-200">AED {agentBalance.totalToPay.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Already Paid:</span><span className="font-semibold text-green-600">AED {agentBalance.totalPaid.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Current Amount to Pay:</span><span className="font-semibold text-sky-600">AED {agentBalance.totalDue.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Outstanding Due:</span><span className="font-semibold text-red-600">AED {agentBalance.totalDue.toFixed(2)}</span></div>
                      </div>
                    )}
                    {!editingPayment && balanceLoading && <p className="text-xs text-gray-400 mt-1">Loading balance...</p>}
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
                    <label className="form-label">Pay Amount (AED)</label>
                    <input type="number" placeholder="0.00" required className="form-input"
                      value={formData.amount}
                      min={0.01}
                      max={!editingPayment && agentBalance ? Number(agentBalance.totalDue.toFixed(2)) : undefined}
                      step="0.01"
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                    {!editingPayment && agentBalance && formData.amount && (() => {
                      const entered = Math.max(0, parseFloat(formData.amount) || 0)
                      const due = agentBalance.totalDue
                      if (entered > due) {
                        return (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Pay Amount cannot exceed AED {due.toFixed(2)}.</p>
                        )
                      }
                      const remaining = due - entered
                      if (remaining > 0) return (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠ After this payment, AED {remaining.toFixed(2)} will still be due.</p>
                      )
                      if (remaining <= 0 && entered > 0) return (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ This covers the full outstanding amount.</p>
                      )
                      return null
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Current Amount to Pay (AED)</label>
                    <input
                      type="text"
                      readOnly
                      className="form-input bg-gray-100 dark:bg-gray-600/50 cursor-not-allowed"
                      value={!editingPayment && agentBalance ? agentBalance.totalDue.toFixed(2) : '0.00'}
                    />
                  </div>
                  <div>
                    <label className="form-label">Due Amount (AED)</label>
                    <input
                      type="text"
                      readOnly
                      className="form-input bg-gray-100 dark:bg-gray-600/50 cursor-not-allowed"
                      value={!editingPayment && agentBalance ? computedDueAfterPay.toFixed(2) : '0.00'}
                    />
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
                  disabled={
                    !formData.paymentNumber.trim()
                    || !formData.agentId
                    || !formData.amount
                    || !formData.date
                    || (!editingPayment && (!!agentBalance && ((safePayAmount <= 0) || (safePayAmount > agentBalance.totalDue))))
                  }
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