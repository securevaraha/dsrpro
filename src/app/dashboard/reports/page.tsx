'use client'
import { useState, useEffect } from 'react'
import { Download, FileText, TrendingUp, Calendar, Filter, Calculator, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { TableSkeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'
import { FilterPanel, FilterButton } from '@/components/ui/filter-panel'
import { Search } from 'lucide-react'

function formatAED(value: number): string {
  if (value >= 1_000_000_000) return `AED ${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(2)}M`
  return `AED ${value.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Reports() {
  const { t } = useLanguage()
  const { user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('receipts')
  const [dateRange, setDateRange] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportData, setReportData] = useState<any>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [agents, setAgents] = useState<{_id: string, name: string}[]>([])
  const [posMachines, setPosMachines] = useState<any[]>([])

  useEffect(() => { fetchReportData() }, [reportType, dateRange])

  useEffect(() => {
    fetch('/api/users?role=agent').then(r => r.ok ? r.json() : null).then(d => d && setAgents(d.users || []))
    fetch('/api/pos-machines').then(r => r.ok ? r.json() : null).then(d => d && setPosMachines(d.machines || []))
  }, [])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: reportType,
        range: dateRange,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      })
      const res = await fetch(`/api/reports?${params}`)
      if (res.ok) setReportData(await res.json())
    } catch {
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = (exportFormat: 'excel' | 'pdf') => {
    if (!reportData) return
    
    if (exportFormat === 'excel') {
      const { exportToExcel } = require('@/lib/excelExport')
      
      // Get current date range for title
      const now = new Date()
      let dateRangeText = ''
      switch (dateRange) {
        case 'today':
          dateRangeText = `Today - ${format(now, 'dd-MMM-yyyy')}`
          break
        case 'week':
          dateRangeText = `This Week - ${format(now, 'dd-MMM-yyyy')}`
          break
        case 'month':
          dateRangeText = `${format(now, 'MMMM yyyy')}`
          break
        case 'year':
          dateRangeText = `${format(now, 'yyyy')}`
          break
        case 'custom':
          dateRangeText = `${startDate} to ${endDate}`
          break
      }
      
      let columns: any[] = []
      let data: any[] = []
      let title = ''
      
      // Define columns based on report type
      if (reportType === 'settlements') {
        title = `SETTLEMENTS Report - ${dateRangeText}`
        columns = [
          { key: 'batchId', label: 'Batch ID', width: 12 },
          { key: 'date', label: 'Date', width: 15 },
          { key: 'agent', label: 'Agent', width: 20 },
          { key: 'posMachine', label: 'POS Machine', width: 20 },
          { key: 'posReceiptAmount', label: 'POS/Receipt Amount', width: 18 },
          { key: 'marginPercent', label: 'Margin %', width: 12 },
          { key: 'marginAmount', label: 'Margin Amount', width: 15 },
          { key: 'bankChargesPercent', label: 'Bank Charges %', width: 15 },
          { key: 'bankChargesAmount', label: 'Bank Charges Amount', width: 18 },
          { key: 'vatPercent', label: 'VAT %', width: 10 },
          { key: 'vatAmount', label: 'VAT Amount', width: 12 },
          { key: 'netReceived', label: 'Net Received', width: 15 },
          { key: 'toPayAmount', label: 'To Pay Amount', width: 15 },
          { key: 'margin', label: 'Margin', width: 12 },
          { key: 'paid', label: 'Paid', width: 12 },
          { key: 'balance', label: 'Balance', width: 12 },
          { key: 'createdBy', label: 'Created By', width: 15 },
          { key: 'updatedBy', label: 'Updated By', width: 15 },
          { key: 'createdDate', label: 'Created Date', width: 18 },
          { key: 'updatedDate', label: 'Updated Date', width: 18 },
          { key: 'description', label: 'Description', width: 25 }
        ]
        data = reportData.items?.map((item: any) => ({
          batchId: item.batchId || item._id?.toString().slice(-8).toUpperCase() || 'N/A',
          date: item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '',
          agent: item.agent || 'N/A',
          posMachine: item.posMachine || 'Edutech / Geodia',
          posReceiptAmount: item.posReceiptAmount?.toFixed(2) || '0.00',
          marginPercent: `${item.marginPercent || 3.75}%`,
          marginAmount: item.marginAmount?.toFixed(2) || '0.00',
          bankChargesPercent: `${item.bankChargesPercent || 2.7}%`,
          bankChargesAmount: item.bankChargesAmount?.toFixed(2) || '0.00',
          vatPercent: `${item.vatPercent || 5}%`,
          vatAmount: item.vatAmount?.toFixed(2) || '0.00',
          netReceived: item.netReceived?.toFixed(2) || '0.00',
          toPayAmount: item.toPayAmount?.toFixed(2) || '0.00',
          margin: item.margin?.toFixed(2) || '0.00',
          paid: item.paid?.toFixed(2) || '0.00',
          balance: item.balance?.toFixed(2) || '0.00',
          createdBy: item.createdBy || 'System',
          updatedBy: item.updatedBy || 'System',
          createdDate: item.createdDate ? format(new Date(item.createdDate), 'dd-MMM-yyyy HH:mm') : '',
          updatedDate: item.updatedDate ? format(new Date(item.updatedDate), 'dd-MMM-yyyy HH:mm') : '',
          description: item.description || ''
        })) || []
      } else if (reportType === 'receipts') {
        title = `RECEIPTS Report - ${dateRangeText}`
        columns = [
          { key: 'receiptNumber', label: 'Receipt Number', width: 15 },
          { key: 'date', label: 'Date', width: 15 },
          { key: 'agent', label: 'Agent', width: 20 },
          { key: 'paymentMethod', label: 'Payment Method', width: 15 },
          { key: 'amount', label: 'Amount', width: 15 },
          { key: 'description', label: 'Description', width: 25 },
          { key: 'attachments', label: 'Attachments', width: 12 }
        ]
        data = reportData.items?.map((item: any) => ({
          receiptNumber: item.receiptNumber || item.transactionId || 'N/A',
          date: item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '',
          agent: item.agent || 'N/A',
          paymentMethod: item.paymentMethod || 'N/A',
          amount: item.amount?.toFixed(2) || '0.00',
          description: item.description || '',
          attachments: item.attachments || 0
        })) || []
      } else {
        title = `${reportType.toUpperCase()} Report - ${dateRangeText}`
        columns = [
          { key: 'transactionId', label: 'Transaction ID', width: 15 },
          { key: 'date', label: 'Date', width: 15 },
          { key: 'agent', label: 'Agent', width: 20 },
          { key: 'amount', label: 'Amount', width: 15 },
          { key: 'status', label: 'Status', width: 12 },
          { key: 'description', label: 'Description', width: 25 }
        ]
        data = reportData.items?.map((item: any) => ({
          transactionId: item.transactionId || item.receiptNumber || 'N/A',
          date: item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '',
          agent: item.agent || 'N/A',
          amount: item.amount?.toFixed(2) || '0.00',
          status: item.status || 'completed',
          description: item.description || ''
        })) || []
      }
      
      exportToExcel({
        filename: `${reportType}_report_${format(now, 'yyyy-MM-dd_HH-mm')}`,
        sheetName: reportType.charAt(0).toUpperCase() + reportType.slice(1),
        columns,
        data,
        title,
        isRTL: false
      })
      toast.success('Report exported to Excel')
    } else {
      toast.success('PDF export functionality coming soon')
    }
  }

  const summaryCards = [
    {
      label: 'Total Revenue',
      value: formatAED(reportData?.totalRevenue || 0),
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Total Transactions',
      value: String(reportData?.totalTransactions || 0),
      icon: Calendar,
      color: 'text-primary',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      label: 'Average Transaction',
      value: formatAED(reportData?.averageTransaction || 0),
      icon: FileText,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Commission Earned',
      value: formatAED(reportData?.totalCommission || 0),
      icon: Calculator,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ]

  const filteredItems = (reportData?.items || []).filter((item: any) => {
    const matchBatchId = !filters.batchId || (item.receiptNumber || item.transactionId || '').toLowerCase().includes(filters.batchId.toLowerCase())
    const matchAgent = !filters.agent || filters.agent === 'all' || item.agentId === filters.agent || item.agent === agents.find(a => a._id === filters.agent)?.name
    const matchPOS = !filters.posMachine || filters.posMachine === 'all' || item.posMachineId === filters.posMachine
    return matchBatchId && matchAgent && matchPOS
  })

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length

  const filterFields = [
    { key: 'batchId', label: 'Batch ID', type: 'text' as const, placeholder: 'Filter by batch ID...' },
    { key: 'agent', label: 'Agent', type: 'select' as const, options: [
      { value: 'all', label: 'All Agents' },
      ...agents.map(a => ({ value: a._id, label: a.name }))
    ]},
    { key: 'posMachine', label: 'POS Machine', type: 'select' as const, options: [
      { value: 'all', label: 'All POS Machines' },
      ...posMachines.map(m => ({ value: m._id, label: `${m.segment} / ${m.brand} — ${m.terminalId}` }))
    ]},
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('reports')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('viewReports')}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => exportReport('excel')} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('exportExcel')}</span>
            <span className="sm:hidden">Excel</span>
          </button>
          <button onClick={() => exportReport('pdf')} className="dubai-button inline-flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('exportPDF')}</span>
            <span className="sm:hidden">PDF</span>
          </button>
          <FilterButton onClick={() => setShowFilter(true)} activeCount={activeFilterCount} />
        </div>
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

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isAdmin && (
          <select className="form-select col-span-2 md:col-span-1" value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="receipts">Receipts Report</option>
            <option value="transactions">All Transactions</option>
            <option value="payments">Payments Report</option>
            <option value="settlements">Settlements Report</option>
            <option value="agents">Agent Performance</option>
            <option value="commission">Commission Report</option>
            <option value="summary">Summary Report</option>
          </select>
        )}
        <select className="form-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">{t('monthlyReport')}</option>
          <option value="year">{t('yearlyReport')}</option>
          <option value="custom">Custom Range</option>
        </select>
        {dateRange === 'custom' && (
          <>
            <DatePicker placeholder="Start Date" value={startDate} onChange={setStartDate} />
            <DatePicker placeholder="End Date" value={endDate} onChange={setEndDate} />
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="dubai-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 truncate">{card.label}</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white break-words leading-snug">
                    {loading ? <span className="inline-block h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : card.value}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Data Table */}
      <div className="dubai-card">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Details
          </h3>
        </div>

        {loading ? (
          <div className="p-5"><TableSkeleton rows={5} columns={isAdmin ? 11 : 6} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {(reportType === 'settlements' ? [
                    'Batch ID', 'Date', 'Agent', 'POS Machine', 'POS/Receipt Amount', 
                    'Margin %', 'Margin Amount', 'Bank Charges %', 'Bank Charges Amount',
                    'VAT %', 'VAT Amount', 'Net Received', 'To Pay Amount', 'Margin',
                    'Paid', 'Balance', 'Created By', 'Updated By', 'Created Date', 'Updated Date', 'Description'
                  ] : reportType === 'receipts' ? [
                    'Receipt Number', 'Date', 'Agent', 'Payment Method', 'Amount', 'Description', 'Attachments'
                  ] : [
                    'Transaction ID', 'Date', 'Agent', 'Amount', 'Status', 'Description'
                  ]).map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.length > 0 ? filteredItems.map((item: any, i: number) => {
                  if (reportType === 'settlements') {
                    const posAmount = item.posReceiptAmount || item.amount || 0
                    const marginPercent = item.marginPercent || 3.75
                    const marginAmount = (posAmount * marginPercent) / 100
                    const bankChargesPercent = item.bankChargesPercent || 2.7
                    const bankChargesAmount = (posAmount * bankChargesPercent) / 100
                    const vatPercent = item.vatPercent || 5
                    const vatAmount = (marginAmount * vatPercent) / 100
                    const netReceived = posAmount - (marginAmount + bankChargesAmount + vatAmount)
                    const toPayAmount = posAmount - marginAmount - bankChargesAmount
                    const finalMargin = marginAmount - bankChargesAmount - vatAmount
                    const balance = toPayAmount - (item.paid || 0)
                    
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {item.batchId || item._id?.toString().slice(-8).toUpperCase() || 'N/A'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.agent || '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.posMachine || 'Edutech / Geodia'}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                          AED {posAmount.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {marginPercent}%
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          AED {marginAmount.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {bankChargesPercent}%
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          AED {bankChargesAmount.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {vatPercent}%
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          AED {vatAmount.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          AED {netReceived.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          AED {toPayAmount.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          AED {finalMargin.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          AED {(item.paid || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          AED {balance.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.createdBy || 'System'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.updatedBy || 'System'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.createdDate ? format(new Date(item.createdDate), 'dd-MMM-yyyy HH:mm') : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.updatedDate ? format(new Date(item.updatedDate), 'dd-MMM-yyyy HH:mm') : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {item.description || '—'}
                        </td>
                      </tr>
                    )
                  } else if (reportType === 'receipts') {
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {item.receiptNumber || item.transactionId || '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.agent || '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.paymentMethod || '—'}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                          AED {(item.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {item.description || '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.attachments || 0}
                        </td>
                      </tr>
                    )
                  } else {
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {item.transactionId || item.receiptNumber || '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.agent || '—'}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                          AED {(item.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'completed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {item.status || 'completed'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {item.description || '—'}
                        </td>
                      </tr>
                    )
                  }
                }) : (
                  <tr>
                    <td colSpan={reportType === 'settlements' ? 21 : reportType === 'receipts' ? 7 : 6} className="px-4 py-12 text-center">
                      <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No data available for selected criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
