'use client'
import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Search, Download, History } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { RoleGuard } from '@/components/RoleGuard'
import { TableSkeleton } from '@/components/ui/skeleton'
import { FilterPanel, FilterButton } from '@/components/ui/filter-panel'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

type PaymentStatus = 'due'

interface UnsettledPayment {
  _id: string
  transactionId: string
  agentId: { _id: string; name: string } | null
  amount: number
  paymentMethod: string
  description: string
  status: PaymentStatus
  createdAt: string
  createdBy?: { name: string }
}

interface SettlementHistoryItem {
  _id: string
  transactionId: string
  agentId: { _id: string; name: string } | null
  amount: number
  paymentMethod: string
  description: string
  status: 'completed'
  createdAt: string
  createdBy?: { name: string }
}

const statusConfig = {
  due:     { label: 'Due',     icon: AlertCircle, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
}

const methodColor: Record<string, string> = {
  cash: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  bank: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  upi:  'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  card: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
}

function safeAmount(value: number): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function formatAEDFull(value: number): string {
  const amount = safeAmount(value)
  return `AED ${amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatAEDCompact(value: number): string {
  const amount = safeAmount(value)
  const abs = Math.abs(amount)
  if (abs >= 1_000_000_000_000) return `AED ${(amount / 1_000_000_000_000).toFixed(2)}T`
  if (abs >= 1_000_000_000) return `AED ${(amount / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `AED ${(amount / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `AED ${(amount / 1_000).toFixed(2)}K`
  return formatAEDFull(amount)
}

export default function Settlements() {
  const { t } = useLanguage()
  const [payments, setPayments] = useState<UnsettledPayment[]>([])
  const [settlementHistory, setSettlementHistory] = useState<SettlementHistoryItem[]>([])
  const [agents, setAgents] = useState<{ _id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [tempFilters, setTempFilters] = useState<Record<string, string>>({})
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<UnsettledPayment | null>(null)
  const [settleNote, setSettleNote] = useState('')

  useEffect(() => {
    fetchUnsettled()
    fetchSettlementHistory()
    fetchAgents()
  }, [])

  const fetchUnsettled = async () => {
    try {
      setLoading(true)
      const res = await fetchWithAuth('/api/payments/settle')
      if (!res.ok) throw new Error('Failed to load unsettled items')
      const data = await res.json()
      const all = (data.transactions || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setPayments(all)
    } catch {
      toast.error('Failed to load settlements')
    } finally {
      setLoading(false)
    }
  }

  const fetchSettlementHistory = async () => {
    try {
      const res = await fetchWithAuth('/api/transactions?type=payment&limit=500')
      if (!res.ok) return
      const data = await res.json()
      const history = (data.transactions || []).filter((t: any) => {
        if (t.type !== 'payment') return false
        if (t.status !== 'completed') return false
        const source = String(t.metadata?.source || '').toLowerCase()
        return source === 'settlement' || source === 'manual-payment'
      }).map((t: any) => ({
        _id: t._id,
        transactionId: t.transactionId,
        agentId: t.agentId ? { _id: t.agentId._id || t.agentId, name: t.agentId.name || 'Unknown Agent' } : null,
        amount: Number(t.amount || 0),
        paymentMethod: t.paymentMethod || 'cash',
        description: t.description || 'Settlement payment',
        status: 'completed' as const,
        createdAt: t.createdAt,
        createdBy: t.createdBy ? { name: t.createdBy.name || 'System' } : { name: 'System' },
      }))
      setSettlementHistory(history)
    } catch {}
  }

  const fetchAgents = async () => {
    try {
      const res = await fetchWithAuth('/api/users?role=agent')
      if (res.ok) {
        const data = await res.json()
        setAgents(data.users || [])
      }
    } catch {}
  }

  const openSettle = (payment: UnsettledPayment) => {
    setSelectedPayment(payment)
    setSettleNote('')
    setShowSettleModal(true)
  }

  const handleSettle = async () => {
    if (!selectedPayment) return
    setSettling(true)
    try {
      const res = await fetchWithAuth('/api/payments/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedPayment.agentId?._id,
          note: settleNote,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`Settlement completed for ${data.settledReceipts || 0} receipt(s), AED ${(data.settledAmount || 0).toFixed(2)} cleared`)
      setShowSettleModal(false)
      setSelectedPayment(null)
      fetchUnsettled()
      fetchSettlementHistory()
    } catch {
      toast.error('Failed to settle payment')
    } finally {
      setSettling(false)
    }
  }

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length

  const filterFields = [
    { key: 'agent', label: 'Agent', type: 'select' as const, options: [
      { value: 'all', label: 'All Agents' },
      ...agents.map(a => ({ value: a._id, label: a.name })),
    ]},
    { key: 'status', label: 'Status', type: 'select' as const, options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'due', label: 'Due' },
      { value: 'settled', label: 'Settled' },
    ]},
    { key: 'dateFrom', label: 'Date From', type: 'date' as const },
    { key: 'dateTo', label: 'Date To', type: 'date' as const },
  ]

  const filtered = payments.filter(p => {
    const matchesSearch =
      p.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.agentId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAgent = !filters.agent || filters.agent === 'all' || p.agentId?._id === filters.agent
    const matchesStatus = !filters.status || filters.status === 'all' || filters.status === 'due'
    const pDate = new Date(p.createdAt)
    const matchesFrom = !filters.dateFrom || pDate >= new Date(filters.dateFrom)
    const matchesTo = !filters.dateTo || pDate <= new Date(filters.dateTo + 'T23:59:59')
    return matchesSearch && matchesAgent && matchesStatus && matchesFrom && matchesTo
  })

  const historyFiltered = settlementHistory.filter((h) => {
    const matchesSearch =
      h.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.agentId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAgent = !filters.agent || filters.agent === 'all' || h.agentId?._id === filters.agent
    const matchesStatus = !filters.status || filters.status === 'all' || filters.status === 'settled'
    const hDate = new Date(h.createdAt)
    const matchesFrom = !filters.dateFrom || hDate >= new Date(filters.dateFrom)
    const matchesTo = !filters.dateTo || hDate <= new Date(filters.dateTo + 'T23:59:59')
    return matchesSearch && matchesAgent && matchesStatus && matchesFrom && matchesTo
  })

  const totalAmount = filtered.reduce((s, p) => s + p.amount, 0)
  const settledAmount = historyFiltered.reduce((s, h) => s + h.amount, 0)
  const visibleGrandTotal = totalAmount + settledAmount

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Settlements</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Payments requiring follow-up — pending, due, or failed
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const { exportToExcel } = require('@/lib/excelExport')
                exportToExcel({
                  filename: 'settlements_report',
                  sheetName: 'Settlements',
                  columns: [
                    { key: 'entryType', label: 'Entry Type', width: 16 },
                    { key: 'transactionId', label: 'Batch ID', width: 24 },
                    { key: 'agentName', label: 'Agent', width: 24 },
                    { key: 'date', label: 'Date', width: 16 },
                    { key: 'amount', label: 'Amount', width: 18 },
                    { key: 'paymentMethod', label: 'Method', width: 16 },
                    { key: 'status', label: 'Status', width: 14 },
                    { key: 'createdByDate', label: 'Created By / Date', width: 28 },
                    { key: 'description', label: 'Description', width: 40 },
                  ],
                  data: [
                    ...filtered.map(p => ({
                      ...p,
                      entryType: 'Outstanding',
                      agentName: p.agentId?.name || '—',
                      date: format(new Date(p.createdAt), 'dd-MMM-yyyy'),
                      amount: `AED ${p.amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      paymentMethod: (p.paymentMethod || '').toUpperCase(),
                      status: p.status === 'due' ? 'Due' : p.status,
                      createdByDate: `${p.createdBy?.name || '—'} | ${format(new Date(p.createdAt), 'dd-MMM-yyyy HH:mm')}`,
                    })),
                    ...historyFiltered.map(h => ({
                      ...h,
                      entryType: 'Settled',
                      agentName: h.agentId?.name || '—',
                      date: format(new Date(h.createdAt), 'dd-MMM-yyyy'),
                      amount: `AED ${h.amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      paymentMethod: (h.paymentMethod || '').toUpperCase(),
                      status: 'Settled',
                      createdByDate: `${h.createdBy?.name || '—'} | ${format(new Date(h.createdAt), 'dd-MMM-yyyy HH:mm')}`,
                    })),
                    {
                      transactionId: `Grand Total (${filtered.length + historyFiltered.length} records)`,
                      amount: `AED ${visibleGrandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    }
                  ],
                  title: 'Settlements Report',
                  grandTotals: {
                    enabled: true,
                    summary: `Grand Total: AED ${visibleGrandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  },
                  isRTL: false
                })
              }}
              className="btn-secondary inline-flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by batch ID, agent, description..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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

        {/* Table */}
        <div className="mt-6">
          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : filtered.length === 0 && historyFiltered.length === 0 ? (
            <div className="dubai-card text-center py-16">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                {payments.length === 0 && settlementHistory.length === 0 ? 'No settlement data yet' : 'No results match your filters'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {payments.length === 0 && settlementHistory.length === 0
                  ? 'Settlement records will appear here after you settle payments.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filtered.length > 0 && (
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">Outstanding Settlements</div>
                )}
                {filtered.map((p) => {
                  const cfg = statusConfig[p.status]
                  const Icon = cfg.icon
                  return (
                    <div key={p._id} className="dubai-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{p.transactionId}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${cfg.color}`}>
                          <Icon className="h-3 w-3" />{cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{p.agentId?.name || '—'}</span>
                        <span className="text-base font-semibold text-primary">AED {p.amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-1">{p.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{format(new Date(p.createdAt), 'dd-MMM-yyyy')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${methodColor[p.paymentMethod] || ''}`}>
                          {p.paymentMethod?.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => openSettle(p)}
                          className="w-full dubai-button text-sm py-2 inline-flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark as Settled
                        </button>
                      </div>
                    </div>
                  )
                })}

                {historyFiltered.length > 0 && (
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1 pt-2">Settlement History</div>
                )}
                {historyFiltered.map((h) => (
                  <div key={h._id} className="dubai-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{h.transactionId}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                        <CheckCircle className="h-3 w-3" />Settled
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{h.agentId?.name || '—'}</span>
                      <span className="text-base font-semibold text-primary">AED {h.amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">{h.description || 'Settlement payment'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{format(new Date(h.createdAt), 'dd-MMM-yyyy')}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${methodColor[h.paymentMethod] || ''}`}>
                        {h.paymentMethod?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="dubai-card p-4 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Grand Total ({filtered.length + historyFiltered.length} records)</span>
                    <span className="text-base font-bold text-primary">AED {visibleGrandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto dubai-card !p-0">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      {['Batch ID', 'Agent', 'Date', 'Amount', 'Method', 'Status', 'Created By / Date', 'Description', 'Action'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filtered.length > 0 && (
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <td colSpan={9} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Outstanding Settlements</td>
                      </tr>
                    )}
                    {filtered.map((p) => {
                      const cfg = statusConfig[p.status]
                      const Icon = cfg.icon
                      return (
                        <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{p.transactionId}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{p.agentId?.name || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{format(new Date(p.createdAt), 'dd-MMM-yyyy')}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary">
                            AED {p.amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${methodColor[p.paymentMethod] || 'bg-gray-100 text-gray-700'}`}>
                              {p.paymentMethod?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${cfg.color}`}>
                              <Icon className="h-3 w-3" />{cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            <div className="meta-compact">
                              <div className="meta-compact-name">{p.createdBy?.name || '—'}</div>
                              <div className="meta-compact-date">{format(new Date(p.createdAt), 'dd-MMM-yyyy HH:mm')}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{p.description}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => openSettle(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Settle
                            </button>
                          </td>
                        </tr>
                      )
                    })}

                    {historyFiltered.length > 0 && (
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <td colSpan={9} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-2"><History className="h-3.5 w-3.5" />Settlement History</span>
                        </td>
                      </tr>
                    )}
                    {historyFiltered.map((h) => (
                      <tr key={h._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{h.transactionId}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{h.agentId?.name || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{format(new Date(h.createdAt), 'dd-MMM-yyyy')}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary">
                          AED {h.amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${methodColor[h.paymentMethod] || 'bg-gray-100 text-gray-700'}`}>
                            {h.paymentMethod?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                            <CheckCircle className="h-3 w-3" />Settled
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          <div className="meta-compact">
                            <div className="meta-compact-name">{h.createdBy?.name || 'System'}</div>
                            <div className="meta-compact-date">{format(new Date(h.createdAt), 'dd-MMM-yyyy HH:mm')}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{h.description || 'Settlement payment'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">—</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Grand Total ({filtered.length + historyFiltered.length} records)</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-primary">
                        AED {visibleGrandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={5} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Settle Confirmation Modal */}
        {showSettleModal && selectedPayment && (() => {
          const cfg = statusConfig[selectedPayment.status]
          const Icon = cfg.icon
          return (
            <div className="modal-overlay">
              <div className="modal-content max-w-md">
                <div className="modal-header">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Mark as Settled</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Confirm settlement for this payment</p>
                  </div>
                  <button type="button" onClick={() => setShowSettleModal(false)} className="modal-close-btn">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Batch ID</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedPayment.transactionId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Agent</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedPayment.agentId?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Amount</span>
                    <span className="font-bold text-primary">AED {selectedPayment.amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Current Status</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${cfg.color}`}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Date</span>
                    <span className="text-gray-700 dark:text-gray-300">{format(new Date(selectedPayment.createdAt), 'dd-MMM-yyyy')}</span>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="form-label">Settlement Note <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea
                    rows={3}
                    className="form-input resize-none"
                    placeholder="e.g. Received via bank transfer on 26-Mar-2026..."
                    value={settleNote}
                    onChange={(e) => setSettleNote(e.target.value)}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowSettleModal(false)}
                    disabled={settling}
                    className="btn-secondary w-full sm:w-auto disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSettle}
                    disabled={settling}
                    className="dubai-button w-full sm:w-auto disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {settling
                      ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Settling...</>
                      : <><CheckCircle className="h-4 w-4" />Confirm Settlement</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </RoleGuard>
  )
}
