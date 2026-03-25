'use client'
import { useState, useEffect } from 'react'
import { Download, FileText, TrendingUp, Calendar, Filter, Calculator, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { TableSkeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'

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
  const [segmentFilter, setSegmentFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [reportData, setReportData] = useState<any>(null)

  useEffect(() => { fetchReportData() }, [reportType, dateRange])

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
      const { exportToExcel, reportColumns } = require('@/lib/excelExport')
      const mappedData = reportData.items?.map((r: any) => {
        const amt = r.amount || 0
        const marginAmt = r.commissionPercentage != null ? (amt * r.commissionPercentage / 100) : null
        const bankAmt = r.bankCharges != null ? (amt * r.bankCharges / 100) : null
        const vatAmt = r.vatPercentage != null && bankAmt != null ? (bankAmt * r.vatPercentage / 100) : null
        return {
          ...r,
          date: r.date ? format(new Date(r.date), 'dd-MMM-yyyy') : (r.createdAt ? format(new Date(r.createdAt), 'dd-MMM-yyyy') : ''),
          transactionId: r.receiptNumber || r.transactionId || r.description,
          posMachineInfo: r.posMachineSegment && r.posMachineBrand ? `${r.posMachineSegment} / ${r.posMachineBrand}` : 'No POS',
          margin: marginAmt != null ? `AED ${marginAmt.toFixed(2)} (${r.commissionPercentage}%)` : '',
          bankCharges: bankAmt != null ? `AED ${bankAmt.toFixed(2)} (${r.bankCharges}%)` : '',
          vat: vatAmt != null ? `AED ${vatAmt.toFixed(2)} (${r.vatPercentage}%)` : '',
          amount: `AED ${amt.toLocaleString()}`,
          createdBy: r.createdBy || '',
          updatedBy: r.updatedBy || '',
          createdAtDate: r.createdAt ? format(new Date(r.createdAt), 'dd-MMM-yyyy HH:mm') : '',
          updatedAtDate: r.updatedAt ? format(new Date(r.updatedAt), 'dd-MMM-yyyy HH:mm') : '',
          agent: r.agent || '',
        }
      }) || []
      exportToExcel({
        filename: `${reportType}_report`,
        sheetName: reportType.charAt(0).toUpperCase() + reportType.slice(1),
        columns: isAdmin ? reportColumns.reportsAdmin(t) : reportColumns.reportsAgent(t),
        data: mappedData,
        title: `${reportType.toUpperCase()} Report - ${dateRange}`,
        isRTL: false,
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
    const matchSeg = segmentFilter === 'all' || item.posMachineSegment === segmentFilter
    const matchBrand = brandFilter === 'all' || item.posMachineBrand === brandFilter
    return matchSeg && matchBrand
  })

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
        </div>
      </div>

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
        <select className="form-select" value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)}>
          <option value="all">All Segments</option>
          {reportData?.segments?.map((s: string) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
          <option value="all">All Brands</option>
          {reportData?.brands?.map((b: string) => <option key={b} value={b}>{b}</option>)}
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
                  {['Batch ID', 'Agent', 'POS Machine', 'Created Date', 'Updated Date',
                    ...(isAdmin ? ['Created By', 'Updated By', 'Margin', 'Bank Charges', 'VAT'] : []),
                    'Amount'
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.length > 0 ? filteredItems.map((item: any, i: number) => {
                  const amt = item.amount || 0
                  const marginAmt = item.commissionPercentage != null ? (amt * item.commissionPercentage / 100).toFixed(2) : null
                  const bankAmt = item.bankCharges != null ? (amt * item.bankCharges / 100).toFixed(2) : null
                  const vatAmt = item.vatPercentage != null && bankAmt != null ? ((parseFloat(bankAmt) * item.vatPercentage) / 100).toFixed(2) : null
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {item.receiptNumber || item.transactionId || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {item.agent || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {item.posMachineSegment && item.posMachineBrand ? `${item.posMachineSegment} / ${item.posMachineBrand}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {item.createdAt ? format(new Date(item.createdAt), 'dd-MMM-yyyy') : (item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '—')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {item.updatedAt ? format(new Date(item.updatedAt), 'dd-MMM-yyyy') : '—'}
                      </td>
                      {isAdmin && (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.createdBy || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.updatedBy || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {marginAmt != null ? `AED ${marginAmt} (${item.commissionPercentage}%)` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {bankAmt != null ? `AED ${bankAmt} (${item.bankCharges}%)` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {vatAmt != null ? `AED ${vatAmt} (${item.vatPercentage}%)` : '—'}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                        AED {amt.toLocaleString()}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={isAdmin ? 11 : 6} className="px-4 py-12 text-center">
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
