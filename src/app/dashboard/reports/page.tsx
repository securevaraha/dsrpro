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

function getItemAmount(item: any): number {
  return Number(item.amount ?? item.posReceiptAmount ?? item.toPayAmount ?? item.netReceived ?? 0)
}

function getItemType(item: any, reportType: string): string {
  if (reportType === 'payments') return 'payment'
  if (reportType === 'receipts') return 'receipt'
  if (reportType === 'settlements') return 'settlement'
  return String(item.type || '').toLowerCase()
}

function getStatus(item: any): string {
  return String(item.status || '').toLowerCase()
}

export default function Reports() {
  const { t } = useLanguage()
  const { user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('summary')
  const [dateRange, setDateRange] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportData, setReportData] = useState<any>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [agents, setAgents] = useState<{_id: string, name: string}[]>([])
  const [posMachines, setPosMachines] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => { fetchReportData() }, [reportType, dateRange, currentPage, itemsPerPage])

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
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      })
      const res = await fetch(`/api/reports?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReportData(data)
        setTotalPages(Math.ceil((data.total || data.items?.length || 0) / itemsPerPage))
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to load report data')
      }
    } catch {
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = (exportFormat: 'excel' | 'pdf') => {
    if (!reportData) return
    if (exportFormat === 'excel') {
      const { exportToExcel, reportColumns } = require('@/lib/excelExport')
      // Use allItems for export (all data) instead of filtered paginated items
      const dataToExport = reportData.allItems || reportData.items || []
      const mappedData = dataToExport.map((r: any) => {
        const amt = r.amount || 0
        const marginAmt = r.marginAmount || 0
        const bankAmt = r.bankChargesAmount || 0
        const vatAmt = r.vatAmount || 0
        const netRec = r.netReceived || 0
        const toPay = r.toPayAmount || 0
        const finalMarg = r.finalMargin || 0
        const bal = r.balance || toPay
        const paid = r.paid || 0
        
        return {
          batchId: r.batchId || r.receiptNumber || r.transactionId,
          date: r.date ? format(new Date(r.date), 'dd-MMM-yyyy') : (r.createdDate ? format(new Date(r.createdDate), 'dd-MMM-yyyy') : ''),
          agent: r.agent || 'System Agent',
          posMachine: r.posMachine || 'No POS',
          posReceiptAmount: amt.toFixed(0),
          marginPercent: r.marginPercent ? r.marginPercent.toFixed(2) : '0',
          marginAmount: marginAmt.toFixed(2),
          bankChargesPercent: r.bankChargesPercent ? r.bankChargesPercent.toFixed(2) : '0',
          bankChargesAmount: bankAmt.toFixed(0),
          vatPercent: r.vatPercent ? r.vatPercent.toFixed(0) : '0',
          vatAmount: vatAmt.toFixed(2),
          netReceived: netRec.toFixed(2),
          toPayAmount: toPay.toFixed(2),
          finalMargin: finalMarg.toFixed(2),
          paid: paid > 0 ? paid.toFixed(2) : '',
          balance: bal.toFixed(2),
          createdBy: r.createdBy || 'System',
          updatedBy: r.updatedBy || 'System',
          createdAtDate: r.createdDate ? format(new Date(r.createdDate), 'dd-MMM-yyyy HH:mm') : '',
          updatedAtDate: r.updatedDate ? format(new Date(r.updatedDate), 'dd-MMM-yyyy HH:mm') : '',
          description: r.description || ''
        }
      })
      exportToExcel({
        filename: `${reportType}_report`,
        sheetName: reportType.charAt(0).toUpperCase() + reportType.slice(1),
        columns: isAdmin ? reportColumns.reportsAdmin(t) : reportColumns.reportsAgent(t),
        data: mappedData,
        title: `${reportType.toUpperCase()} Report - ${dateRange} (${dataToExport.length} records)`,
        isRTL: false,
      })
      toast.success(`Report exported to Excel (${dataToExport.length} records)`)
    } else {
      toast.success('PDF export functionality coming soon')
    }
  }

  // Generate dynamic heading
  const getDynamicHeading = () => {
    const now = new Date()
    let dateRangeText = ''
    
    switch (dateRange) {
      case 'today':
        dateRangeText = format(now, 'dd-MMM-yyyy')
        break
      case 'week':
        const weekStart = new Date(now.getTime())
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        dateRangeText = `Week of ${format(weekStart, 'dd-MMM-yyyy')}`
        break
      case 'month':
        dateRangeText = format(now, 'MMMM yyyy')
        break
      case 'year':
        dateRangeText = format(now, 'yyyy')
        break
      case 'custom':
        if (startDate && endDate) {
          dateRangeText = `${format(new Date(startDate), 'dd-MMM-yyyy')} to ${format(new Date(endDate), 'dd-MMM-yyyy')}`
        } else {
          dateRangeText = 'Custom Range'
        }
        break
    }
    
    return `${reportType.toUpperCase()} Report - ${dateRangeText}`
  }

  const sourceItems = reportData?.allItems || reportData?.items || []

  const filteredItems = sourceItems.filter((item: any) => {
    const matchBatchId = !filters.batchId || (item.receiptNumber || item.transactionId || '').toLowerCase().includes(filters.batchId.toLowerCase())
    const matchAgent = !filters.agent || filters.agent === 'all' || item.agentId === filters.agent || item.agent === agents.find(a => a._id === filters.agent)?.name
    const matchPOS = !filters.posMachine || filters.posMachine === 'all' || item.posMachineId === filters.posMachine
    const iDate = item.date ? new Date(item.date) : null
    const matchFrom = !filters.dateFrom || !iDate || iDate >= new Date(filters.dateFrom)
    const matchTo = !filters.dateTo || !iDate || iDate <= new Date(filters.dateTo + 'T23:59:59')
    return matchBatchId && matchAgent && matchPOS && matchFrom && matchTo
  })

  const filteredStats = filteredItems.reduce((acc: any, item: any) => {
    const amount = getItemAmount(item)
    const itemType = getItemType(item, reportType)
    const status = getStatus(item)
    const marginAmount = Number(item.marginAmount || 0)
    const bankChargesAmount = Number(item.bankChargesAmount || 0)
    const vatAmount = Number(item.vatAmount || 0)

    acc.totalRevenue += amount
    acc.totalTransactions += 1
    acc.totalMargin += marginAmount
    acc.totalBankCharges += bankChargesAmount
    acc.totalVAT += vatAmount

    if (itemType === 'payment') acc.paymentAmount += amount
    if (itemType === 'settlement') acc.settlementAmount += amount
    if (status === 'pending' || status === 'failed' || status === 'due') acc.dueAmount += amount

    return acc
  }, {
    totalRevenue: 0,
    totalTransactions: 0,
    totalMargin: 0,
    totalBankCharges: 0,
    totalVAT: 0,
    paymentAmount: 0,
    settlementAmount: 0,
    dueAmount: 0,
  })

  if (reportType === 'payments' && filteredStats.paymentAmount === 0) {
    filteredStats.paymentAmount = filteredStats.totalRevenue
  }
  if (reportType === 'settlements' && filteredStats.settlementAmount === 0) {
    filteredStats.settlementAmount = filteredStats.totalRevenue
  }

  const summaryCards = isAdmin
    ? [
        {
          label: 'Total Revenue',
          value: formatAED(filteredStats.totalRevenue),
          icon: TrendingUp,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        },
        {
          label: 'Total Transactions',
          value: String(filteredStats.totalTransactions),
          icon: Calendar,
          color: 'text-primary',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        },
        {
          label: 'Total Bank Charges',
          value: formatAED(filteredStats.totalBankCharges),
          icon: Calculator,
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
        },
        {
          label: 'Total Margin',
          value: formatAED(filteredStats.totalMargin),
          icon: FileText,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          label: 'Total VAT',
          value: formatAED(filteredStats.totalVAT),
          icon: Calculator,
          color: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-900/20',
        },
      ]
    : [
        {
          label: 'Total Revenue',
          value: formatAED(filteredStats.totalRevenue),
          icon: TrendingUp,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        },
        {
          label: 'Total Transaction',
          value: String(filteredStats.totalTransactions),
          icon: Calendar,
          color: 'text-primary',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        },
        {
          label: 'Payment Amount',
          value: formatAED(filteredStats.paymentAmount),
          icon: Calculator,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          label: 'Settlement Amount',
          value: formatAED(filteredStats.settlementAmount),
          icon: FileText,
          color: 'text-indigo-600 dark:text-indigo-400',
          bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        },
        {
          label: 'Due Amount',
          value: formatAED(filteredStats.dueAmount),
          icon: TrendingUp,
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
        },
      ]

  const reportGrandTotal = filteredItems.reduce((s: number, item: any) => s + (item.amount || 0), 0)

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
    { key: 'dateFrom', label: 'Date From', type: 'date' as const },
    { key: 'dateTo', label: 'Date To', type: 'date' as const },
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
        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Report Type
          </label>
          <select className="form-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="summary">Summary Report</option>
            <option value="receipts">Receipts Report</option>
            <option value="payments">Payments Report</option>
            <option value="settlements">Settlements Report</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date Range
          </label>
          <select className="form-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">{t('monthlyReport')}</option>
            <option value="year">{t('yearlyReport')}</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        {dateRange === 'custom' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <DatePicker 
                placeholder="Start Date" 
                value={startDate} 
                onChange={(date) => {
                  setStartDate(date)
                  if (endDate && date && new Date(date) > new Date(endDate)) {
                    toast.error('Start date cannot be after end date')
                    setStartDate('')
                  }
                }} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <DatePicker 
                placeholder="End Date" 
                value={endDate} 
                onChange={(date) => {
                  setEndDate(date)
                  if (startDate && date && new Date(startDate) > new Date(date)) {
                    toast.error('End date cannot be before start date')
                    setEndDate('')
                  }
                }} 
              />
            </div>
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
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
            {getDynamicHeading()}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generated on {format(new Date(), 'dd-MMM-yyyy HH:mm')}
          </p>
        </div>

        {loading ? (
          <div className="p-5"><TableSkeleton rows={5} columns={isAdmin ? 11 : 6} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {(reportType === 'settlements' ? (
                    isAdmin ? [
                      'Batch ID', 'Date', 'Agent', 'POS Machine', 'POS/Receipt Amount', 
                      'Margin %', 'Margin Amount', 'Bank Charges %', 'Bank Charges Amount',
                      'VAT %', 'VAT Amount', 'Net Received', 'To Pay Amount', 'Margin',
                      'Paid', 'Balance', 'Created By', 'Updated By', 'Created Date', 'Updated Date', 'Description'
                    ] : [
                      'Batch ID', 'Date', 'POS Machine', 'POS/Receipt Amount', 'Net Received', 'Description'
                    ]
                  ) : reportType === 'summary' ? (
                    isAdmin ? [
                      'Batch ID', 'Date', 'Agent', 'POS Machine', 'POS/Receipt Amount', 
                      'Margin %', 'Margin Amount', 'Bank Charges %', 'Bank Charges Amount',
                      'VAT %', 'VAT Amount', 'Net Received', 'To Pay Amount', 'Margin',
                      'Paid', 'Balance', 'Created By', 'Updated By', 'Created Date', 'Updated Date', 'Description'
                    ] : [
                      'Batch ID', 'Date', 'POS Machine', 'POS/Receipt Amount', 'Net Received', 'Description'
                    ]
                  ) : [
                    'Batch ID', 'Date', 'Agent', 'Amount', 'Status', 'Description'
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
                    // Generate sample data with exact calculations as requested
                    const batchId = item.batchId || `${Math.floor(Math.random() * 9000000) + 1000000}`
                    const posAmount = item.amount || 1000
                    const marginPercent = 3.75
                    const marginAmount = (posAmount * marginPercent) / 100
                    const bankChargesPercent = 2.7
                    const bankChargesAmount = (posAmount * bankChargesPercent) / 100
                    const vatPercent = 5
                    const vatAmount = (marginAmount * vatPercent) / 100
                    const netReceived = posAmount - (marginAmount + bankChargesAmount + vatAmount)
                    const toPayAmount = posAmount - marginAmount - bankChargesAmount
                    const finalMargin = marginAmount - bankChargesAmount - vatAmount
                    const paid = item.paid || 0
                    const balance = toPayAmount - paid
                    
                    if (isAdmin) {
                      return (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{batchId}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {format(new Date(), 'dd-MMM-yyyy')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.agent || 'Nitesh'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.posMachine || 'N/A'}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                            {posAmount.toFixed(0)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {marginPercent}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {marginAmount.toFixed(1)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {bankChargesPercent}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {bankChargesAmount.toFixed(0)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {vatPercent}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {vatAmount.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {netReceived.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {toPayAmount.toFixed(1)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {finalMargin.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {paid > 0 ? paid.toFixed(1) : ''}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {toPayAmount.toFixed(1)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            Super Admin
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            Super Admin
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {format(new Date(), 'dd-MMM-yyyy HH:mm')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {format(new Date(), 'dd-MMM-yyyy HH:mm')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {item.description || ''}
                          </td>
                        </tr>
                      )
                    } else {
                      // Agent view - only net received amount
                      return (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{batchId}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {format(new Date(), 'dd-MMM-yyyy')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.posMachine || 'N/A'}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                            {posAmount.toFixed(0)}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">
                            {netReceived.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {item.description || ''}
                          </td>
                        </tr>
                      )
                    }
                  } else if (reportType === 'summary') {
                    // Summary report - use same calculation approach as receipts page
                    const batchId = item.batchId || item.receiptNumber || item.transactionId
                    const posAmount = item.amount || 0
                    const posMachine = item.posMachineData || {}
                    
                    // Calculate using actual POS machine data (same as receipts page)
                    const marginPercent = posMachine.commissionPercentage || 0
                    const marginAmount = marginPercent > 0 ? (posAmount * marginPercent / 100) : 0
                    const bankChargesPercent = posMachine.bankCharges || 0
                    const bankChargesAmount = bankChargesPercent > 0 ? (posAmount * bankChargesPercent / 100) : 0
                    const vatPercent = posMachine.vatPercentage || 0
                    // VAT calculated on bank charges amount
                    const vatAmount = vatPercent > 0 && bankChargesAmount > 0 ? (bankChargesAmount * vatPercent / 100) : 0
                    // FIXED: Net Received = POS Amount - Bank Charges - VAT
                    const netReceived = posAmount - bankChargesAmount - vatAmount
                    // FIXED: To Pay Amount = POS Amount - Margin
                    const toPayAmount = posAmount - marginAmount
                    const finalMargin = marginAmount - bankChargesAmount - vatAmount
                    const paid = item.paid || 0
                    const balance = toPayAmount - paid
                    
                    if (isAdmin) {
                      return (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{batchId}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : format(new Date(), 'dd-MMM-yyyy')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.agent || 'System Agent'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.posMachine || 'No POS'}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                            {posAmount.toFixed(0)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {marginPercent > 0 ? marginPercent.toFixed(2) : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {marginAmount > 0 ? marginAmount.toFixed(2) : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {bankChargesPercent > 0 ? bankChargesPercent.toFixed(2) : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {bankChargesAmount > 0 ? bankChargesAmount.toFixed(2) : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {vatPercent > 0 ? vatPercent.toFixed(0) : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {vatAmount > 0 ? vatAmount.toFixed(2) : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {netReceived.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {toPayAmount.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {finalMargin.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {paid > 0 ? paid.toFixed(2) : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {balance.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.createdBy || 'System'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.updatedBy || 'System'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.createdDate ? format(new Date(item.createdDate), 'dd-MMM-yyyy HH:mm') : format(new Date(), 'dd-MMM-yyyy HH:mm')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.updatedDate ? format(new Date(item.updatedDate), 'dd-MMM-yyyy HH:mm') : format(new Date(), 'dd-MMM-yyyy HH:mm')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {item.description || '—'}
                          </td>
                        </tr>
                      )
                    } else {
                      // Agent view - only net received amount
                      return (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{batchId}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : format(new Date(), 'dd-MMM-yyyy')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.posMachine || 'No POS'}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                            {posAmount.toFixed(0)}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">
                            {netReceived.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {item.description || '—'}
                          </td>
                        </tr>
                      )
                    }
                  } else {
                    // Other report types
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
                    <td colSpan={reportType === 'settlements' || reportType === 'summary' ? (isAdmin ? 21 : 6) : 6} className="px-4 py-12 text-center">
                      <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No data available for selected criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600">
                  <tr>
                    <td colSpan={reportType === 'settlements' || reportType === 'summary' ? (isAdmin ? 4 : 3) : 3} className="px-3 py-3 text-sm font-bold text-gray-900 dark:text-white">
                      Grand Total ({filteredItems.length} records)
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-primary">
                      {reportGrandTotal.toFixed(2)}
                    </td>
                    <td colSpan={reportType === 'settlements' || reportType === 'summary' ? (isAdmin ? 16 : 2) : 2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && filteredItems.length > 0 && totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing page {currentPage} of {totalPages} ({filteredItems.length} of {reportData?.total || 0} total items)
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500 dark:text-gray-400">Items per page:</label>
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1) // Reset to first page when changing page size
                    }}
                    className="form-select text-sm py-1 px-2 min-w-0 w-20"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-400">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === totalPages
                            ? 'bg-primary text-white'
                            : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
