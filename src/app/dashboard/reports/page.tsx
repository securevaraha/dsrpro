'use client'
import { useState, useEffect } from 'react'
import { Download, FileText, TrendingUp, Calendar, Filter } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ChartSkeleton, TableSkeleton } from '@/components/ui/skeleton'

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

  useEffect(() => {
    fetchReportData()
  }, [reportType, dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: reportType,
        range: dateRange,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      })
      
      const response = await fetch(`/api/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = (format: 'excel' | 'pdf') => {
    if (!reportData) return
    
    if (format === 'excel') {
      const { exportToExcel } = require('@/lib/excelExport')
      exportToExcel({
        filename: `${reportType}_report`,
        sheetName: reportType.charAt(0).toUpperCase() + reportType.slice(1),
        columns: [
          { key: 'date', label: 'Date', width: 15 },
          { key: 'description', label: 'Description', width: 25 },
          { key: 'amount', label: 'Amount (AED)', width: 15 },
          { key: 'status', label: 'Status', width: 12 }
        ],
        data: reportData.items || [],
        title: `${reportType.toUpperCase()} Report - ${dateRange}`,
        isRTL: false
      })
      toast.success('Report exported to Excel')
    } else {
      toast.success('PDF export functionality coming soon')
    }
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('reports')}</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{t('viewReports')}</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => exportReport('excel')}
            className="btn-secondary inline-flex items-center justify-center"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('exportExcel')}
          </button>
          <button
            onClick={() => exportReport('pdf')}
            className="dubai-button inline-flex items-center justify-center"
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('exportPDF')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {isAdmin && (
          <select
            className="form-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="receipts">Receipts Report</option>
            <option value="transactions">All Transactions</option>
            <option value="payments">Payments Report</option>
            <option value="settlements">Settlements Report</option>
            <option value="agents">Agent Performance</option>
            <option value="commission">Commission Report</option>
            <option value="summary">Summary Report</option>
          </select>
        )}
        
        <select
          className="form-select"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">{t('monthlyReport')}</option>
          <option value="year">{t('yearlyReport')}</option>
          <option value="custom">Custom Range</option>
        </select>

        <select
          className="form-select"
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value)}
        >
          <option value="all">All Segments</option>
          {reportData?.segments?.map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          className="form-select"
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
        >
          <option value="all">All Brands</option>
          {reportData?.brands?.map((b: string) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {dateRange === 'custom' && (
          <>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
          </>
        )}
      </div>

      {/* Reports Table - Desktop */}
      <div className="mt-8 hidden md:block">
        {loading ? (
          <div className="space-y-6">
            <ChartSkeleton />
            <TableSkeleton rows={5} columns={4} />
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              <div className="dubai-card p-4 sm:p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-success flex-shrink-0" />
                  <div className="ml-3 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Revenue</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                      AED {reportData.totalRevenue?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="dubai-card p-4 sm:p-6">
                <div className="flex items-center">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                  <div className="ml-3 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Transactions</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {reportData.totalTransactions || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="dubai-card p-4 sm:p-6">
                <div className="flex items-center">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-warning flex-shrink-0" />
                  <div className="ml-3 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Average Transaction</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                      AED {reportData.averageTransaction?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="dubai-card p-4 sm:p-6">
                <div className="flex items-center">
                  <Filter className="h-6 w-6 sm:h-8 sm:w-8 text-accent flex-shrink-0" />
                  <div className="ml-3 sm:ml-4 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Commission Earned</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                      AED {reportData.totalCommission?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="dubai-card">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Details
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="table-cell font-medium">Transaction #</th>
                      <th className="table-cell font-medium">Agent</th>
                      <th className="table-cell font-medium">POS Machine</th>
                      <th className="table-cell font-medium">Created Date</th>
                      <th className="table-cell font-medium">Updated Date</th>
                      {isAdmin && (
                        <>
                          <th className="table-cell font-medium">Created By</th>
                          <th className="table-cell font-medium">Updated By</th>
                          <th className="table-cell font-medium">Margin (%)</th>
                          <th className="table-cell font-medium">Bank Charges</th>
                          <th className="table-cell font-medium">VAT (%)</th>
                        </>
                      )}
                      <th className="table-cell font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {(reportData.items?.filter((item: any) => {
                      const matchSeg = segmentFilter === 'all' || item.posMachineSegment === segmentFilter
                      const matchBrand = brandFilter === 'all' || item.posMachineBrand === brandFilter
                      return matchSeg && matchBrand
                    }) || []).map((item: any, index: number) => (
                      <tr key={index} className="table-row">
                        <td className="table-cell font-medium">
                          {item.receiptNumber || item.transactionId || '—'}
                        </td>
                        <td className="table-cell">{item.agent || '—'}</td>
                        <td className="table-cell">
                          {item.posMachineSegment && item.posMachineBrand
                            ? `${item.posMachineSegment} / ${item.posMachineBrand}`
                            : '—'}
                        </td>
                        <td className="table-cell">
                          {item.createdAt ? format(new Date(item.createdAt), 'dd-MMM-yyyy') : (item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '—')}
                        </td>
                        <td className="table-cell">
                          {item.updatedAt ? format(new Date(item.updatedAt), 'dd-MMM-yyyy') : '—'}
                        </td>
                        {isAdmin && (
                          <>
                            <td className="table-cell">{item.createdBy || '—'}</td>
                            <td className="table-cell">{item.updatedBy || '—'}</td>
                            <td className="table-cell">{item.commissionPercentage != null ? `${item.commissionPercentage}%` : '—'}</td>
                            <td className="table-cell">{item.bankCharges != null ? `AED ${item.bankCharges}` : '—'}</td>
                            <td className="table-cell">{item.vatPercentage != null ? `${item.vatPercentage}%` : '—'}</td>
                          </>
                        )}
                        <td className="table-cell font-medium">
                          AED {item.amount?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {(!reportData.items || reportData.items.length === 0) && (
                      <tr>
                        <td colSpan={isAdmin ? 11 : 6} className="table-cell text-center py-8">
                          <p className="text-gray-500 dark:text-gray-400">No data available for selected criteria</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Report Data</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Select different criteria to generate reports
            </p>
          </div>
        )}
      </div>

      {/* Reports Cards - Mobile */}
      <div className="mt-8 md:hidden">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dubai-card p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : reportData ? (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="dubai-card p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-6 w-6 text-success mr-3" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      AED {reportData.totalRevenue?.toLocaleString() || reportData.totalAmount?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="dubai-card p-4">
                <div className="flex items-center">
                  <Calendar className="h-6 w-6 text-primary mr-3" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {reportData.totalTransactions || reportData.totalReceipts || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Item Cards */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Details
              </h3>
              {reportData.items?.length > 0 ? (
                reportData.items
                  .filter((item: any) => {
                    const matchSeg = segmentFilter === 'all' || item.posMachineSegment === segmentFilter
                    const matchBrand = brandFilter === 'all' || item.posMachineBrand === brandFilter
                    return matchSeg && matchBrand
                  })
                  .map((item: any, index: number) => (
                  <div key={index} className="dubai-card p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.receiptNumber || item.transactionId || item.description || '—'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.agent} • {item.createdAt ? format(new Date(item.createdAt), 'dd-MMM-yyyy') : (item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '—')}
                        </p>
                        {item.posMachineSegment && (
                          <p className="text-xs text-gray-400">{item.posMachineSegment} / {item.posMachineBrand}</p>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 grid grid-cols-3 gap-1">
                        <span>Margin: {item.commissionPercentage != null ? `${item.commissionPercentage}%` : '—'}</span>
                        <span>Charges: {item.bankCharges != null ? `AED ${item.bankCharges}` : '—'}</span>
                        <span>VAT: {item.vatPercentage != null ? `${item.vatPercentage}%` : '—'}</span>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        AED {item.amount?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No data available</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Report Data</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Select different criteria to generate reports
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
