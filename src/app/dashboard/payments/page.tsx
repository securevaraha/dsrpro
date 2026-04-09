'use client'
import { useState, useEffect } from 'react'
import { Plus, Download, Eye, Edit, Trash2, CreditCard, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'
import { FilterPanel, FilterButton } from '@/components/ui/filter-panel'
import { Search } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { TablePagination, getPaginatedSlice, getTotalPages } from '@/components/ui/table-pagination'
import { matchesDateRange } from '@/lib/date-range'
import { DateRangeFilter } from '@/components/ui/date-range-filter'

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
  source?: string
  createdBy?: { name: string }
  createdAt?: string
}

interface DuePaymentEntry {
  _id: string
  sourceReceiptId: string
  paymentNumber: string
  date: string
  agentId: string
  agentName: string
  paymentMethod: 'cash' | 'bank' | 'upi' | 'card'
  amount: number
  description: string
  status: 'due'
  createdBy?: { name: string }
  createdAt?: string
}

type PaymentRow = (Payment & { rowType: 'completed' }) | (DuePaymentEntry & { rowType: 'due' })

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Payments() {
  const { t } = useLanguage()
  const [payments, setPayments] = useState<Payment[]>([])
  const [dueEntries, setDueEntries] = useState<DuePaymentEntry[]>([])
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
  const [tempFilters, setTempFilters] = useState<Record<string, string>>({})
  const [dateRangeFilter, setDateRangeFilter] = useState('all')
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [agentBalance, setAgentBalance] = useState<{ totalToPay: number; totalNetReceived: number; totalPaid: number; totalDue: number } | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [selectedDueReceiptId, setSelectedDueReceiptId] = useState<string | null>(null)
  const [selectedDueEntryAmount, setSelectedDueEntryAmount] = useState<number | null>(null)

  useEffect(() => {
    fetchPayments()
    fetchDueEntries()
    fetchAgents()
  }, [])

  const fetchDueEntries = async () => {
    try {
      const response = await fetchWithAuth('/api/transactions?type=receipt&limit=500')
      if (!response.ok) return
      const data = await response.json()
      const dues = (data.transactions || []).map((t: any) => {
        const amount = Number(t.amount || 0)
        const chargesPercent = Number(t.posMachine?.commissionPercentage || 0)
        const toPayAmount = amount - ((amount * chargesPercent) / 100)
        const paidAmount = Math.min(Number(t.paidAmount || 0), toPayAmount)
        const settlementAmount = Math.min(Number(t.settlementAmount || 0), Math.max(0, toPayAmount - paidAmount))
        const due = Math.max(0, toPayAmount - paidAmount - settlementAmount)
        return {
          _id: `due-${t._id}`,
          sourceReceiptId: t._id,
          paymentNumber: t.metadata?.receiptNumber || t.transactionId,
          date: t.date || t.createdAt,
          agentId: t.agentId?._id || '',
          agentName: t.agentId?.name || 'Unknown',
          paymentMethod: 'cash' as const,
          amount: due,
          description: t.description || `Due for receipt ${t.metadata?.receiptNumber || t.transactionId}`,
          status: 'due' as const,
          createdBy: t.createdBy || { name: 'System' },
          createdAt: t.createdAt,
        }
      }).filter((entry: DuePaymentEntry) => entry.amount > 0.001)
      setDueEntries(dues)
    } catch {}
  }

  const fetchAgentDueMap = async (agentList: {_id: string, name: string}[]) => {
    const entries = await Promise.all(agentList.map(async (agent) => {
      try {
        const res = await fetchWithAuth(`/api/payments/agent-balance?agentId=${agent._id}`)
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
      const response = await fetchWithAuth('/api/users?role=agent')
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
      const response = await fetchWithAuth('/api/transactions?type=payment&limit=500')
      if (response.ok) {
        const data = await response.json()
        const formattedPayments = (data.transactions || [])
          .filter((t: any) => String(t.metadata?.source || 'manual-payment').toLowerCase() !== 'settlement')
          .map((t: any) => ({
          _id: t._id,
          paymentNumber: t.transactionId,
          date: t.date || t.createdAt,
          agentId: t.agentId?._id || '',
          agentName: t.agentId?.name || 'Unknown',
          paymentMethod: t.paymentMethod,
          amount: t.amount,
          description: t.description || 'Payment',
          status: t.status || 'completed',
          source: t.metadata?.source || 'manual-payment',
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
        if (payAmount > totalDue + 0.005) {
          throw new Error(`Pay Amount cannot exceed total due (${formatAmount(totalDue)})`)
        }

        const sendRes = await fetchWithAuth('/api/payments/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: formData.agentId,
            amount: payAmount,
            paymentMethod: formData.paymentMethod,
            description: formData.description,
            date: formData.date,
            receiptId: selectedDueReceiptId || undefined,
          })
        })
        if (sendRes.ok) {
          const sendData = await sendRes.json()
          if ((sendData.unappliedAmount || 0) > 0.01) {
            toast.success(`Applied ${formatAmount(sendData.appliedAmount)}. ${formatAmount(sendData.unappliedAmount)} was not applied (no pending due). Remaining due: ${formatAmount(sendData.outstandingDueAfter)}`)
          } else if ((sendData.outstandingDueAfter || 0) > 0.01) {
            toast.success(`Payment sent. Remaining due: ${formatAmount(sendData.outstandingDueAfter)}`)
          } else {
            toast.success('Payment sent successfully. All dues are cleared.')
          }
          setShowModal(false)
          resetForm()
          fetchAgentBalance(formData.agentId)
          fetchAgents()
          fetchPayments()
          fetchDueEntries()
        } else {
          const err = await sendRes.json()
          throw new Error(err.error || 'Failed to send payment')
        }
        return
      }

      const response = await fetchWithAuth(url, {
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
        fetchDueEntries()
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
      const response = await fetchWithAuth(`/api/transactions/${deletingPayment._id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Payment deleted successfully')
        setShowDeleteDialog(false)
        setDeletingPayment(null)
        fetchPayments()
        fetchDueEntries()
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
    setSelectedDueReceiptId(null)
    setSelectedDueEntryAmount(null)
  }

  const openPayDueModal = (entry: DuePaymentEntry) => {
    const id = `P${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2,4).toUpperCase()}`
    setSelectedDueReceiptId(entry.sourceReceiptId)
    setSelectedDueEntryAmount(entry.amount)
    setFormData({
      paymentNumber: id,
      date: format(new Date(), 'yyyy-MM-dd'),
      agentId: entry.agentId,
      paymentMethod: 'cash',
      bankAccount: '',
      amount: entry.amount.toFixed(2),
      description: '',
    })
    setEditingPayment(null)
    fetchAgentBalance(entry.agentId)
    setShowModal(true)
  }

  const fetchAgentBalance = async (agentId: string) => {
    if (!agentId) { setAgentBalance(null); return }
    setBalanceLoading(true)
    try {
      const res = await fetchWithAuth(`/api/payments/agent-balance?agentId=${agentId}`)
      if (res.ok) setAgentBalance(await res.json())
    } catch {}
    finally { setBalanceLoading(false) }
  }

  const openAddModal = () => {
    const id = `P${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2,4).toUpperCase()}`
    setFormData({ paymentNumber: id, date: format(new Date(), 'yyyy-MM-dd'), agentId: '', paymentMethod: 'cash', bankAccount: '', amount: '', description: '' })
    setEditingPayment(null)
    setSelectedDueReceiptId(null)
    setSelectedDueEntryAmount(null)
    setAgentBalance(null)
    setShowModal(true)
  }

  const enteredPayAmount = parseFloat(formData.amount)
  const safePayAmount = Number.isFinite(enteredPayAmount) ? Math.max(0, enteredPayAmount) : 0
  const totalDueAmount = agentBalance?.totalDue ?? 0
  const currentPayableDue = selectedDueReceiptId ? (selectedDueEntryAmount ?? totalDueAmount) : totalDueAmount
  const computedDueAfterPay = Math.max(0, currentPayableDue - safePayAmount)
  const handlePayAmountChange = (rawValue: string) => {
    if (rawValue === '') {
      setFormData({ ...formData, amount: '' })
      return
    }

    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) return

    // Do not allow zero/negative values.
    if (parsed <= 0) return

    // For new payments, cap to the currently payable due.
    if (!editingPayment && agentBalance && parsed > currentPayableDue + 0.005) {
      setFormData({ ...formData, amount: currentPayableDue.toFixed(2) })
      return
    }

    setFormData({ ...formData, amount: rawValue })
  }
  const payableAgents = editingPayment
    ? agents
    : agents.filter((a) => (agentDueMap[a._id] || 0) > 0.001)

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.agentName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBatchId = !filters.batchId || p.paymentNumber.toLowerCase().includes(filters.batchId.toLowerCase())
    const matchesAgent = !filters.agent || filters.agent === 'all' || p.agentId === filters.agent
    const matchesStatus = !filters.status || filters.status === 'all' || p.status === filters.status
    return matchesSearch && matchesBatchId && matchesAgent && matchesStatus && matchesDateRange(p.date, dateRangeFilter, dateRangeStart, dateRangeEnd)
  })

  const filteredDueEntries = dueEntries.filter((d) => {
    const matchesSearch = d.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.agentName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBatchId = !filters.batchId || d.paymentNumber.toLowerCase().includes(filters.batchId.toLowerCase())
    const matchesAgent = !filters.agent || filters.agent === 'all' || d.agentId === filters.agent
    const matchesStatus = !filters.status || filters.status === 'all' || filters.status === 'due'
    return matchesSearch && matchesBatchId && matchesAgent && matchesStatus && matchesDateRange(d.date, dateRangeFilter, dateRangeStart, dateRangeEnd)
  })

  const rows: PaymentRow[] = [
    ...filteredDueEntries.map((d) => ({ ...d, rowType: 'due' as const })),
    ...filteredPayments.map((p) => ({ ...p, rowType: 'completed' as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filters, payments, dueEntries, itemsPerPage, dateRangeFilter, dateRangeStart, dateRangeEnd])

  const paginatedRows = getPaginatedSlice(rows, currentPage, itemsPerPage)
  const totalPages = getTotalPages(rows.length, itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const dueRows = paginatedRows.filter((r) => r.rowType === 'due')
  const completedRows = paginatedRows.filter((r) => r.rowType === 'completed')

  const grandTotal = rows.reduce((s, p) => s + p.amount, 0)

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length

  const filterFields = [
    { key: 'batchId', label: 'Batch ID', type: 'text' as const, placeholder: 'Filter by batch ID...' },
    { key: 'agent', label: 'Agent', type: 'select' as const, options: [
      { value: 'all', label: 'All Agents' },
      ...agents.map(a => ({ value: a._id, label: a.name }))
    ]},
    { key: 'status', label: 'Payment Status', type: 'select' as const, options: [
      { value: 'all', label: 'All' },
      { value: 'due', label: 'Due' },
      { value: 'completed', label: 'Completed' },
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
            onClick={() => {
              const { exportToExcel, reportColumns } = require('@/lib/excelExport')
              exportToExcel({
                filename: 'payments_report',
                sheetName: 'Payments',
                columns: reportColumns.payments(t),
                data: [
                  ...rows.map(p => ({
                    ...p,
                    entryType: p.rowType === 'due' ? 'Receipt Due' : 'Payment',
                    date: format(new Date(p.date), 'dd-MMM-yyyy'),
                    paymentMethod: p.rowType === 'due' ? 'RECEIPT DUE' : p.paymentMethod.toUpperCase(),
                    status: p.status === 'due' ? 'Due' : p.status.charAt(0).toUpperCase() + p.status.slice(1),
                    amount: Number(p.amount.toFixed(2)),
                    createdByDate: `${p.createdBy?.name || 'System'} | ${format(new Date(p.createdAt || p.date), 'dd-MMM-yyyy HH:mm')}`
                  }))
                ],
                title: t('paymentsReport'),
                grandTotals: {
                  enabled: true,
                  row: {
                    label: `Grand Total (${rows.length} records)`,
                    values: { amount: grandTotal }
                  }
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
      <div className="mt-5 flex flex-col sm:flex-row gap-2">
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
        <DateRangeFilter
          value={dateRangeFilter}
          startDate={dateRangeStart}
          endDate={dateRangeEnd}
          onChange={setDateRangeFilter}
          onStartDateChange={setDateRangeStart}
          onEndDateChange={setDateRangeEnd}
          options={[
            { value: 'all', label: 'All Time' },
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
            { value: 'year', label: 'This Year' },
            { value: 'custom', label: 'Custom Range' },
          ]}
        />
        <FilterButton onClick={() => { setTempFilters(filters); setShowFilter(true) }} activeCount={activeFilterCount} />
      </div>

      <FilterPanel
        open={showFilter}
        onClose={() => { setTempFilters(filters); setShowFilter(false) }}
        fields={filterFields}
        values={tempFilters}
        onChange={(key, value) => setTempFilters(prev => ({ ...prev, [key]: value }))}
        onApply={() => setFilters(tempFilters)}
        onReset={() => { setTempFilters({}); setFilters({}) }}
        activeCount={activeFilterCount}
      />

      {/* Payments */}
      <div className="mt-6">
        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : rows.length === 0 ? (
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
              {dueRows.length > 0 && (
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">Due Payments</div>
              )}
              {dueRows.map((payment) => (
                <div key={payment._id} className="dubai-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{payment.paymentNumber}</span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                      payment.paymentMethod === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                      payment.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                      payment.paymentMethod === 'upi' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                    }`}>
                      {payment.rowType === 'due' ? 'RECEIPT DUE' : payment.paymentMethod.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{payment.agentName}</span>
                    <span className="text-base font-semibold text-gray-900 dark:text-white">{formatAmount(payment.amount)}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{payment.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{format(new Date(payment.date), 'dd-MMM-yyyy')}</span>
                    <span className="text-xs text-gray-400">{payment.createdBy?.name || 'System'}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                    {payment.rowType === 'due' ? (
                      <button
                        onClick={() => openPayDueModal(payment)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Pay
                      </button>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              ))}
              {completedRows.length > 0 && (
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1 pt-2">Completed Payments</div>
              )}
              {completedRows.map((payment) => (
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
                    <span className="text-base font-semibold text-gray-900 dark:text-white">{formatAmount(payment.amount)}</span>
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
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Grand Total ({rows.length} records)</span>
                  <span className="text-base font-bold text-primary">{formatAmount(grandTotal)}</span>
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
                  {dueRows.length > 0 && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={9} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Due Payments</td>
                    </tr>
                  )}
                  {dueRows.map((payment) => (
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
                          {payment.rowType === 'due' ? 'RECEIPT DUE' : payment.paymentMethod.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
                          Due
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary">
                        {formatAmount(payment.amount)}
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
                        {payment.rowType === 'due' ? (
                          <button
                            onClick={() => openPayDueModal(payment)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Pay
                          </button>
                        ) : (
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
                        )}
                      </td>
                    </tr>
                  ))}
                  {completedRows.length > 0 && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={9} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Completed Payments</td>
                    </tr>
                  )}
                  {completedRows.map((payment) => (
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
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                          Completed
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary">
                        {formatAmount(payment.amount)}
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
                    <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Grand Total ({rows.length} records)</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-primary">{formatAmount(grandTotal)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {!loading && rows.length > 0 && (
        <TablePagination
          totalItems={rows.length}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {/* Add/Edit Payment Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content form-modal">
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
                    <SearchableSelect
                      value={formData.agentId}
                      onChange={(value) => {
                        setFormData({ ...formData, agentId: value })
                        if (!editingPayment) fetchAgentBalance(value)
                      }}
                      options={[
                        { value: '', label: `Select ${t('agent')}` },
                        ...payableAgents.map((agent) => ({ value: agent._id, label: agent.name })),
                      ]}
                      placeholder={`Select ${t('agent')}`}
                    />
                    {!editingPayment && payableAgents.length === 0 && (
                      <p className="text-xs text-amber-500 mt-1">No agents have pending due amount.</p>
                    )}
                    {!editingPayment && agentBalance && (
                      <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs space-y-0.5">
                        {selectedDueReceiptId && (
                          <div className="flex justify-between border-b border-blue-100 dark:border-blue-800 pb-0.5 mb-0.5">
                            <span className="text-gray-500">Selected Receipt Due:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{formatAmount(currentPayableDue)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Open Outstanding Due:</span>
                          <span className="font-semibold text-red-600">{formatAmount(currentPayableDue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Due After This Payment:</span>
                          <span className="font-semibold text-amber-600">{formatAmount(computedDueAfterPay)}</span>
                        </div>
                      </div>
                    )}
                    {!editingPayment && balanceLoading && <p className="text-xs text-gray-400 mt-1">Loading balance...</p>}
                  </div>
                  <div>
                    <label className="form-label">{t('paymentMethod')}</label>
                    <SearchableSelect
                      value={formData.paymentMethod}
                      onChange={(value) => setFormData({ ...formData, paymentMethod: value as any })}
                      options={[
                        { value: 'cash', label: 'Cash' },
                        { value: 'bank', label: 'Bank Transfer' },
                        { value: 'upi', label: 'UPI' },
                        { value: 'card', label: 'Card' },
                      ]}
                      placeholder="Payment Method"
                    />
                  </div>
                  <div>
                    <label className="form-label">Pay Amount (AED)</label>
                    <input type="number" placeholder="0.00" required className="form-input"
                      value={formData.amount}
                      min={0.01}
                      max={!editingPayment && agentBalance ? Number((currentPayableDue + 0.005).toFixed(2)) : undefined}
                      step="0.01"
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault()
                        }
                      }}
                      onChange={(e) => handlePayAmountChange(e.target.value)}
                    />
                    {!editingPayment && agentBalance && formData.amount && (() => {
                      const entered = Math.max(0, parseFloat(formData.amount) || 0)
                      const due = currentPayableDue
                      if (entered > due + 0.005) {
                        return (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Pay Amount cannot exceed {formatAmount(due)}.</p>
                        )
                      }
                      const remaining = due - entered
                      if (remaining > 0) return (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠ After this payment, {formatAmount(remaining)} will still be due.</p>
                      )
                      if (remaining <= 0 && entered > 0) return (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ This covers the full outstanding amount.</p>
                      )
                      return null
                    })()}
                  </div>
                </div>
                {formData.paymentMethod === 'bank' && (
                  <div>
                    <label className="form-label">Bank Account</label>
                    <input type="text" placeholder="Bank Account Number" className="form-input"
                      value={formData.bankAccount} onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                    />
                  </div>
                )}
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
                    || (!editingPayment && (!!agentBalance && ((safePayAmount <= 0) || (safePayAmount > currentPayableDue + 0.005))))
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