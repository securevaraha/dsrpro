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

function formatAmountWithPercent(amount: number, percent: number): string {
  return `AED ${amount.toFixed(2)} (${percent.toFixed(2)}%)`
}

export default function Reports() {
  const { t } = useLanguage()
  const { user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('summary')
  const [dateRange, setDateRange] = useState('today')
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
      const { exportMultiSheetExcel } = require('@/lib/excelExport')
      const { exportToExcel } = require('@/lib/excelExport')

      const dataToExport = filteredItems.length ? filteredItems : (reportData.allItems || reportData.items || [])
      const toMoney = (n: number) => `AED ${Number(n || 0).toFixed(2)}`
      const fmtDate = (d: any) => d ? format(new Date(d), 'dd-MMM-yyyy') : '—'
      const fmtDateTime = (d: any) => d ? format(new Date(d), 'dd-MMM-yyyy HH:mm') : '—'

      const normalizeRow = (r: any) => {
        const amount = Number(r.amount ?? r.posReceiptAmount ?? 0)
        const marginPercent = Number(r.marginPercent ?? r.commissionPercentage ?? 0)
        const bankChargesPercent = Number(r.bankChargesPercent ?? r.bankCharges ?? 0)
        const vatPercent = Number(r.vatPercent ?? r.vatPercentage ?? 0)
        const marginAmount = Number(r.marginAmount ?? ((amount * marginPercent) / 100))
        const bankChargesAmount = Number(r.bankChargesAmount ?? ((amount * bankChargesPercent) / 100))
        const vatAmount = Number(r.vatAmount ?? ((amount * vatPercent) / 100))
        const netReceived = Number(r.netReceived ?? (amount - bankChargesAmount - vatAmount))
        const toReceive = Number(r.toPayAmount ?? (amount - bankChargesAmount - vatAmount - marginAmount))
        const received = Number(r.paid ?? r.paidAmount ?? 0)
        const settled = Number(r.settlementAmount ?? 0)
        const remaining = Math.max(0, Number(r.balance ?? r.dueAmount ?? (toReceive - received - settled)))
        const batchId = r.batchId || r.receiptNumber || r.transactionId || '—'
        const posMachine = r.posMachine || (r.posMachineSegment && r.posMachineBrand ? `${r.posMachineSegment}/${r.posMachineBrand}` : 'No POS')
        const date = r.date || r.createdDate || r.createdAt

        return {
          batchId,
          agent: r.agent || 'System Agent',
          posMachine,
          date: fmtDate(date),
          description: r.description || '—',
          receiptAmount: toMoney(amount),
          amount: toMoney(amount),
          bankCharges: `${toMoney(bankChargesAmount)} (${bankChargesPercent.toFixed(2)}%)`,
          vat: `${toMoney(vatAmount)} (${vatPercent.toFixed(2)}%)`,
          margin: `${toMoney(marginAmount)} (${marginPercent.toFixed(2)}%)`,
          netReceived: toMoney(netReceived),
          toReceive: toMoney(toReceive),
          received: toMoney(received),
          settlementAmount: toMoney(settled),
          remainingReceive: remaining > 0.01 ? toMoney(remaining) : '0.00',
          due: remaining > 0.01 ? toMoney(remaining) : '0.00',
          netProfit: toMoney(isAdmin ? marginAmount : received),
          method: (r.paymentMethod || '').toUpperCase(),
          status: r.status ? String(r.status).charAt(0).toUpperCase() + String(r.status).slice(1) : 'Completed',
          createdByDate: `${r.createdBy || 'System'} | ${fmtDateTime(r.createdDate || r.createdAt)}`,
          updatedByDate: `${r.updatedBy || 'System'} | ${fmtDateTime(r.updatedDate || r.updatedAt)}`,
        }
      }

      let columns: any[] = []
      if (reportType === 'summary') {
        columns = isAdmin
          ? [
              { key: 'batchId', label: 'Batch ID', width: 22 },
              { key: 'agent', label: 'Agent', width: 22 },
              { key: 'posMachine', label: 'POS Machine', width: 26 },
              { key: 'date', label: 'Date', width: 16 },
              { key: 'receiptAmount', label: 'Receipt Amount', width: 18 },
              { key: 'bankCharges', label: 'Bank Charges', width: 24 },
              { key: 'vat', label: 'VAT', width: 20 },
              { key: 'margin', label: 'Margin', width: 20 },
              { key: 'toReceive', label: 'To Pay', width: 18 },
              { key: 'received', label: 'Paid', width: 18 },
              { key: 'due', label: 'Due', width: 18 },
              { key: 'netProfit', label: 'Net Profit', width: 18 },
              { key: 'createdByDate', label: 'Created By / Date', width: 30 },
              { key: 'updatedByDate', label: 'Updated By / Date', width: 30 },
              { key: 'description', label: 'Description', width: 40 },
            ]
          : [
              { key: 'batchId', label: 'Batch ID', width: 22 },
              { key: 'date', label: 'Date', width: 16 },
              { key: 'posMachine', label: 'POS Machine', width: 26 },
              { key: 'receiptAmount', label: 'Receipt Amount', width: 18 },
              { key: 'netReceived', label: 'Net Received', width: 18 },
              { key: 'toReceive', label: 'To Receive', width: 18 },
              { key: 'received', label: 'Received', width: 18 },
              { key: 'settlementAmount', label: 'Settlement Amount', width: 20 },
              { key: 'remainingReceive', label: 'Remaining Receive', width: 20 },
              { key: 'description', label: 'Description', width: 40 },
            ]
      } else if (reportType === 'receipts') {
        columns = isAdmin
          ? [
              { key: 'batchId', label: 'Batch ID', width: 22 },
              { key: 'agent', label: 'Agent', width: 22 },
              { key: 'posMachine', label: 'POS Machine', width: 26 },
              { key: 'date', label: 'Date', width: 16 },
              { key: 'receiptAmount', label: 'Receipt Amount', width: 18 },
              { key: 'bankCharges', label: 'Bank Charges', width: 24 },
              { key: 'vat', label: 'VAT', width: 20 },
              { key: 'margin', label: 'Margin', width: 20 },
              { key: 'toReceive', label: 'To Pay', width: 18 },
              { key: 'received', label: 'Paid', width: 18 },
              { key: 'due', label: 'Due', width: 18 },
              { key: 'netProfit', label: 'Net Profit', width: 18 },
              { key: 'createdByDate', label: 'Created By / Date', width: 30 },
              { key: 'updatedByDate', label: 'Updated By / Date', width: 30 },
              { key: 'description', label: 'Description', width: 40 },
            ]
          : [
              { key: 'batchId', label: 'Batch ID', width: 22 },
              { key: 'date', label: 'Date', width: 16 },
              { key: 'posMachine', label: 'POS Machine', width: 26 },
              { key: 'amount', label: 'Amount', width: 18 },
              { key: 'toReceive', label: 'To Receive', width: 18 },
              { key: 'received', label: 'Received', width: 18 },
              { key: 'settlementAmount', label: 'Settlement Amount', width: 20 },
              { key: 'remainingReceive', label: 'Remaining Receive', width: 20 },
              { key: 'description', label: 'Description', width: 40 },
            ]
      } else if (reportType === 'settlements') {
        columns = isAdmin
          ? [
              { key: 'batchId', label: 'Batch ID', width: 22 },
              { key: 'agent', label: 'Agent', width: 22 },
              { key: 'posMachine', label: 'POS Machine', width: 26 },
              { key: 'date', label: 'Date', width: 16 },
              { key: 'receiptAmount', label: 'Receipt Amount', width: 18 },
              { key: 'bankCharges', label: 'Bank Charges', width: 24 },
              { key: 'vat', label: 'VAT', width: 20 },
              { key: 'margin', label: 'Margin', width: 20 },
              { key: 'toReceive', label: 'To Pay', width: 18 },
              { key: 'received', label: 'Paid', width: 18 },
              { key: 'due', label: 'Due', width: 18 },
              { key: 'netProfit', label: 'Net Profit', width: 18 },
              { key: 'createdByDate', label: 'Created By / Date', width: 30 },
              { key: 'updatedByDate', label: 'Updated By / Date', width: 30 },
              { key: 'description', label: 'Description', width: 40 },
            ]
          : [
              { key: 'batchId', label: 'Batch ID', width: 22 },
              { key: 'date', label: 'Date', width: 16 },
              { key: 'posMachine', label: 'POS Machine', width: 26 },
              { key: 'receiptAmount', label: 'POS/Receipt Amount', width: 20 },
              { key: 'netReceived', label: 'Net Received', width: 18 },
              { key: 'description', label: 'Description', width: 40 },
            ]
      } else {
        columns = [
          { key: 'batchId', label: 'Batch ID', width: 22 },
          { key: 'date', label: 'Date', width: 16 },
          { key: 'agent', label: 'Agent', width: 22 },
          { key: 'amount', label: 'Amount', width: 18 },
          { key: 'status', label: 'Status', width: 14 },
          { key: 'description', label: 'Description', width: 40 },
        ]
      }

      const mapped = dataToExport.map(normalizeRow)
      const moneyKey = ['receiptAmount', 'amount', 'toReceive', 'received', 'remainingReceive'].find(k => columns.some((c: any) => c.key === k))

      const withGrandTotal = (rows: any[]) => {
        if (!moneyKey) return rows
        const total = rows.reduce((sum: number, row: any) => {
          const value = Number(String(row[moneyKey] || 0).replace(/[^0-9.-]/g, '') || 0)
          return sum + value
        }, 0)
        const totalRow: any = { batchId: `Grand Total (${rows.length} records)` }
        totalRow[moneyKey] = `AED ${total.toFixed(2)}`
        return [...rows, totalRow]
      }

      const mappedWithTotal = withGrandTotal(mapped)

      if (isAdmin) {
        const grouped: Record<string, any[]> = mapped.reduce((acc: Record<string, any[]>, row: any) => {
          const key = row.agent || 'System Agent'
          if (!acc[key]) acc[key] = []
          acc[key].push(row)
          return acc
        }, {})
        const groupedEntries = Object.entries(grouped) as [string, any[]][]

        const sheets = [
          {
            sheetName: 'All Agents Summary',
            data: mappedWithTotal,
            title: `${reportType.toUpperCase()} Report - All Agents - ${dateRange}`,
            grandTotals: { enabled: !!moneyKey }
          },
          ...groupedEntries.map(([agentName, rows]) => ({
            sheetName: agentName.length > 25 ? `${agentName.slice(0, 25)}...` : agentName,
            data: withGrandTotal(rows),
            title: `${reportType.toUpperCase()} Report - ${agentName} - ${dateRange}`,
            grandTotals: { enabled: !!moneyKey }
          })),
        ]

        exportMultiSheetExcel({
          filename: `${reportType}_report_by_agents`,
          sheets,
          columns,
          isRTL: false,
        })
      } else {
        exportToExcel({
          filename: `${reportType}_report`,
          sheetName: `${reportType.toUpperCase()} Report`,
          columns,
          data: mappedWithTotal,
          title: `${reportType.toUpperCase()} Report - ${dateRange}`,
          grandTotals: {
            enabled: !!moneyKey,
          },
          isRTL: false,
        })
      }

      toast.success(`Report exported (${mapped.length} records)`)
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

  const agentCardTotals = filteredItems.reduce((acc: any, item: any) => {
    const amount = Number(item.amount ?? item.posReceiptAmount ?? 0)
    const marginPercent = Number(item.marginPercent ?? item.commissionPercentage ?? 0)
    const bankChargesPercent = Number(item.bankChargesPercent ?? item.bankCharges ?? 0)
    const vatPercent = Number(item.vatPercent ?? item.vatPercentage ?? 0)
    const marginAmount = Number(item.marginAmount ?? ((amount * marginPercent) / 100))
    const bankChargesAmount = Number(item.bankChargesAmount ?? ((amount * bankChargesPercent) / 100))
    const vatAmount = Number(item.vatAmount ?? ((amount * vatPercent) / 100))
    const netReceived = Number(item.netReceived ?? (amount - bankChargesAmount - vatAmount))
    const toReceive = Number(item.toPayAmount ?? (amount - bankChargesAmount - vatAmount - marginAmount))
    const received = Number(item.paid ?? item.paidAmount ?? 0)
    const settled = Number(item.settlementAmount ?? 0)
    const remainingReceive = Math.max(0, Number(item.balance ?? item.dueAmount ?? (toReceive - received - settled)))

    acc.totalReceiptAmount += amount
    acc.netReceived += netReceived
    acc.toReceive += toReceive
    acc.received += received
    acc.settled += settled
    acc.remainingReceive += remainingReceive
    return acc
  }, {
    totalReceiptAmount: 0,
    netReceived: 0,
    toReceive: 0,
    received: 0,
    settled: 0,
    remainingReceive: 0,
  })

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
        {
          label: 'Net Profit',
          value: formatAED(filteredStats.totalMargin),
          icon: TrendingUp,
          color: 'text-cyan-600 dark:text-cyan-400',
          bg: 'bg-cyan-50 dark:bg-cyan-900/20',
        },
      ]
    : [
        {
          label: 'Total Receipt Amount',
          value: formatAED(agentCardTotals.totalReceiptAmount),
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
          label: 'Net Received',
          value: formatAED(agentCardTotals.netReceived),
          icon: Calculator,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          label: 'To Receive',
          value: formatAED(agentCardTotals.toReceive),
          icon: FileText,
          color: 'text-indigo-600 dark:text-indigo-400',
          bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        },
        {
          label: 'Received',
          value: formatAED(agentCardTotals.received),
          icon: TrendingUp,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        },
        {
          label: 'Settlement Amount',
          value: formatAED(agentCardTotals.settled),
          icon: FileText,
          color: 'text-indigo-600 dark:text-indigo-400',
          bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        },
        {
          label: 'Remaining Receive',
          value: formatAED(agentCardTotals.remainingReceive),
          icon: ArrowRight,
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
        },
        {
          label: 'Net Profit',
          value: formatAED(agentCardTotals.received),
          icon: TrendingUp,
          color: 'text-cyan-600 dark:text-cyan-400',
          bg: 'bg-cyan-50 dark:bg-cyan-900/20',
        },
      ]

  const reportGrandTotal = filteredItems.reduce((s: number, item: any) => s + (item.amount || 0), 0)

  const adminGrandTotals = filteredItems.reduce((acc: any, item: any) => {
    const amount = Number(item.amount ?? item.posReceiptAmount ?? 0)
    const marginPercent = Number(item.marginPercent ?? item.commissionPercentage ?? 0)
    const bankChargesPercent = Number(item.bankChargesPercent ?? item.bankCharges ?? 0)
    const vatPercent = Number(item.vatPercent ?? item.vatPercentage ?? 0)
    const marginAmount = Number(item.marginAmount ?? ((amount * marginPercent) / 100))
    const bankChargesAmount = Number(item.bankChargesAmount ?? ((amount * bankChargesPercent) / 100))
    const vatAmount = Number(item.vatAmount ?? ((amount * vatPercent) / 100))
    const toPayAmount = Number(item.toPayAmount ?? (amount - bankChargesAmount - vatAmount - marginAmount))
    const paidAmount = Number(item.paid ?? item.paidAmount ?? 0)
    const dueAmount = Number(item.balance ?? item.dueAmount ?? (toPayAmount - paidAmount))

    acc.receiptAmount += amount
    acc.bankCharges += bankChargesAmount
    acc.vat += vatAmount
    acc.margin += marginAmount
    acc.toPay += toPayAmount
    acc.paid += paidAmount
    acc.due += Math.max(0, dueAmount)
    acc.netProfit += marginAmount
    return acc
  }, {
    receiptAmount: 0,
    bankCharges: 0,
    vat: 0,
    margin: 0,
    toPay: 0,
    paid: 0,
    due: 0,
    netProfit: 0,
  })

  const agentGrandTotals = filteredItems.reduce((acc: any, item: any) => {
    const amount = Number(item.amount ?? item.posReceiptAmount ?? 0)
    const marginPercent = Number(item.marginPercent ?? item.commissionPercentage ?? 0)
    const bankChargesPercent = Number(item.bankChargesPercent ?? item.bankCharges ?? 0)
    const vatPercent = Number(item.vatPercent ?? item.vatPercentage ?? 0)
    const marginAmount = Number(item.marginAmount ?? ((amount * marginPercent) / 100))
    const bankChargesAmount = Number(item.bankChargesAmount ?? ((amount * bankChargesPercent) / 100))
    const vatAmount = Number(item.vatAmount ?? ((amount * vatPercent) / 100))
    const toReceive = Number(item.toPayAmount ?? (amount - bankChargesAmount - vatAmount - marginAmount))
    const received = Number(item.paid ?? item.paidAmount ?? 0)
    const settled = Number(item.settlementAmount ?? 0)
    const remainingReceive = Math.max(0, Number(item.balance ?? item.dueAmount ?? (toReceive - received - settled)))

    acc.toReceive += toReceive
    acc.received += received
    acc.settled += settled
    acc.remainingReceive += remainingReceive
    return acc
  }, {
    toReceive: 0,
    received: 0,
    settled: 0,
    remainingReceive: 0,
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
      <div className="kpi-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="kpi-card">
              <div className={`kpi-card-icon ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="kpi-card-body">
                <span className="kpi-card-label">{card.label}</span>
                <span className="kpi-card-value">
                  {loading
                    ? <span className="inline-block h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    : card.value
                  }
                </span>
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
          <div className="p-5"><TableSkeleton rows={5} columns={isAdmin && (reportType === 'summary' || reportType === 'receipts' || reportType === 'settlements') ? 15 : 6} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {(reportType === 'settlements' ? (
                    isAdmin ? [
                      'Batch ID', 'Agent', 'POS Machine', 'Date', 'Receipt Amount',
                      'Bank Charges', 'Vat', 'Margin', 'To Pay', 'Paid', 'Due', 'Net Profit',
                      'Created By / Date', 'Updated By / Date', 'Description'
                    ] : [
                      'Batch ID', 'Date', 'POS Machine', 'POS/Receipt Amount', 'Net Received', 'Description'
                    ]
                  ) : reportType === 'summary' ? (
                    isAdmin ? [
                      'Batch ID', 'Agent', 'POS Machine', 'Date', 'Receipt Amount',
                      'Bank Charges', 'Vat', 'Margin', 'To Pay', 'Paid', 'Due', 'Net Profit',
                      'Created By / Date', 'Updated By / Date', 'Description'
                    ] : [
                      'Batch ID', 'Date', 'POS Machine', 'Receipt Amount', 'Net Received', 'To Receive', 'Received', 'Remaining Receive', 'Description'
                    ]
                  ) : reportType === 'receipts' ? (
                    isAdmin ? [
                      'Batch ID', 'Agent', 'POS Machine', 'Date', 'Receipt Amount',
                      'Bank Charges', 'Vat', 'Margin', 'To Pay', 'Paid', 'Due', 'Net Profit',
                      'Created By / Date', 'Updated By / Date', 'Description'
                    ] : [
                      'Batch ID', 'Date', 'POS Machine', 'Amount', 'To Receive', 'Received', 'Remaining Receive', 'Description'
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
                  if (isAdmin && (reportType === 'summary' || reportType === 'receipts' || reportType === 'settlements')) {
                    const amount = Number(item.amount ?? item.posReceiptAmount ?? 0)
                    const marginPercent = Number(item.marginPercent ?? item.commissionPercentage ?? 0)
                    const bankChargesPercent = Number(item.bankChargesPercent ?? item.bankCharges ?? 0)
                    const vatPercent = Number(item.vatPercent ?? item.vatPercentage ?? 0)
                    const marginAmount = Number(item.marginAmount ?? ((amount * marginPercent) / 100))
                    const bankChargesAmount = Number(item.bankChargesAmount ?? ((amount * bankChargesPercent) / 100))
                    const vatAmount = Number(item.vatAmount ?? ((amount * vatPercent) / 100))
                    const toPayAmount = Number(item.toPayAmount ?? (amount - bankChargesAmount - vatAmount - marginAmount))
                    const paidAmount = Number(item.paid ?? item.paidAmount ?? 0)
                    const dueAmount = Number(item.balance ?? item.dueAmount ?? (toPayAmount - paidAmount))
                    const netProfit = marginAmount
                    const isFullyPaid = paidAmount >= toPayAmount - 0.01
                    const paidDisplay = isFullyPaid ? 'Paid' : (paidAmount > 0 ? `AED ${paidAmount.toFixed(2)}` : '—')
                    const batchId = item.batchId || item.receiptNumber || item.transactionId || '—'
                    const posMachine = item.posMachine
                      || (item.posMachineSegment && item.posMachineBrand ? `${item.posMachineSegment}/${item.posMachineBrand}` : 'No POS')

                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{batchId}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.agent || 'System Agent'}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{posMachine}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : (item.createdAt ? format(new Date(item.createdAt), 'dd-MMM-yyyy') : '—')}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-amber-500 dark:text-amber-300 whitespace-nowrap">AED {amount.toFixed(2)}</td>
                        <td className="px-3 py-3 text-sm font-medium text-rose-600 dark:text-rose-300 whitespace-nowrap">{formatAmountWithPercent(bankChargesAmount, bankChargesPercent)}</td>
                        <td className="px-3 py-3 text-sm font-medium text-rose-600 dark:text-rose-300 whitespace-nowrap">{formatAmountWithPercent(vatAmount, vatPercent)}</td>
                        <td className="px-3 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-300 whitespace-nowrap">{formatAmountWithPercent(marginAmount, marginPercent)}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-sky-600 dark:text-sky-300 whitespace-nowrap">AED {toPayAmount.toFixed(2)}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300 whitespace-nowrap">{paidDisplay}</td>
                        <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap">
                          <span className={dueAmount > 0.01 ? 'text-red-600' : 'text-green-600'}>
                            {dueAmount > 0.01 ? `AED ${dueAmount.toFixed(2)}` : '✓ Paid'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300 whitespace-nowrap">AED {netProfit.toFixed(2)}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          <div className="meta-compact">
                            <div className="meta-compact-name">{item.createdBy || 'System'}</div>
                            <div className="meta-compact-date">{item.createdDate || item.createdAt ? format(new Date(item.createdDate || item.createdAt), 'dd-MMM-yyyy HH:mm') : '—'}</div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          <div className="meta-compact">
                            <div className="meta-compact-name">{item.updatedBy || 'System'}</div>
                            <div className="meta-compact-date">{item.updatedDate || item.updatedAt ? format(new Date(item.updatedDate || item.updatedAt), 'dd-MMM-yyyy HH:mm') : '—'}</div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{item.description || '—'}</td>
                      </tr>
                    )
                  }

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
                  } else if (reportType === 'receipts') {
                    const amount = item.amount || 0
                    // Use flat fields sent directly from the API
                    const marginPercent = item.commissionPercentage ?? 0
                    const bankChargesPercent = item.bankCharges ?? 0
                    const vatPercent = item.vatPercentage ?? 0
                    const marginAmount = (amount * marginPercent) / 100
                    const bankChargesAmount = (amount * bankChargesPercent) / 100
                    const vatAmount = (amount * vatPercent) / 100  // VAT on full amount
                    const netReceived = amount - bankChargesAmount - vatAmount
                    const toPayAmount = amount - bankChargesAmount - vatAmount - marginAmount
                    const paidAmount = item.paidAmount || 0
                    const settledAmount = item.settlementAmount || 0
                    const dueAmount = item.dueAmount != null ? item.dueAmount : toPayAmount - paidAmount - settledAmount
                    const payStatus = paidAmount >= toPayAmount - 0.01 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'

                    if (isAdmin) {
                      return (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.receiptNumber || item.transactionId}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.agent || '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.posMachineSegment && item.posMachineBrand ? `${item.posMachineSegment}/${item.posMachineBrand}` : 'No POS'}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">AED {amount.toFixed(2)}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{marginPercent > 0 ? `${marginPercent}%` : '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{marginAmount > 0 ? `AED ${marginAmount.toFixed(2)}` : '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{bankChargesPercent > 0 ? `${bankChargesPercent}%` : '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{bankChargesAmount > 0 ? `AED ${bankChargesAmount.toFixed(2)}` : '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{vatPercent > 0 ? `${vatPercent}%` : '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{vatAmount > 0 ? `AED ${vatAmount.toFixed(2)}` : '—'}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-emerald-600 whitespace-nowrap">AED {netReceived.toFixed(2)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">AED {toPayAmount.toFixed(2)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">{paidAmount > 0 ? `AED ${paidAmount.toFixed(2)}` : '—'}</td>
                          <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap">
                            <span className={dueAmount > 0.01 ? 'text-red-600' : 'text-green-600'}>
                              {dueAmount > 0.01 ? `AED ${dueAmount.toFixed(2)}` : '✓ Paid'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm whitespace-nowrap">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                              payStatus === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                              payStatus === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                              'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                            }`}>{payStatus === 'paid' ? 'Paid' : payStatus === 'partial' ? 'Partial' : 'Unpaid'}</span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{item.description || '—'}</td>
                        </tr>
                      )
                    } else {
                      // Agent view: show To Receive (toPayAmount), Paid, Due
                      return (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.receiptNumber || item.transactionId}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '—'}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">AED {amount.toFixed(2)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">AED {toPayAmount.toFixed(2)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">{paidAmount > 0 ? `AED ${paidAmount.toFixed(2)}` : '—'}</td>
                          <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap">
                            <span className={dueAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                              {dueAmount > 0 ? `AED ${dueAmount.toFixed(2)}` : (settledAmount > 0.01 && paidAmount < toPayAmount - 0.01 ? '✓ Settled' : '✓ Received')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{item.description || '—'}</td>
                        </tr>
                      )
                    }
                  } else if (reportType === 'summary') {
                    // Use pre-calculated values sent directly from the API — no re-calculation needed
                    const batchId = item.batchId || item.receiptNumber || item.transactionId
                    const posAmount = item.amount || 0
                    const marginPercent = item.marginPercent || 0
                    const marginAmount = item.marginAmount || 0
                    const bankChargesPercent = item.bankChargesPercent || 0
                    const bankChargesAmount = item.bankChargesAmount || 0
                    const vatPercent = item.vatPercent || 0
                    const vatAmount = item.vatAmount || 0
                    const netReceived = item.netReceived ?? (posAmount - bankChargesAmount - vatAmount)
                    const toPayAmount = item.toPayAmount ?? (posAmount - bankChargesAmount - vatAmount - marginAmount)
                    const paid = item.paid || 0
                    const settled = item.settlementAmount || 0
                    const due = item.balance ?? (toPayAmount - paid - settled)
                    
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
                          <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">
                            {toPayAmount.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">
                            {paid > 0 ? paid.toFixed(2) : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap">
                            <span className={due > 0.01 ? 'text-red-600' : 'text-green-600'}>
                              {due > 0.01 ? due.toFixed(2) : '✓ Paid'}
                            </span>
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
                          <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">
                            AED {toPayAmount.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">
                            {paid > 0 ? `AED ${paid.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap">
                            <span className={due > 0.01 ? 'text-red-600' : 'text-green-600'}>
                              {due > 0.01 ? `AED ${due.toFixed(2)}` : (settled > 0.01 && paid < toPayAmount - 0.01 ? '✓ Settled' : '✓ Received')}
                            </span>
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
                    <td colSpan={reportType === 'settlements' ? (isAdmin ? 15 : 6) : reportType === 'summary' ? (isAdmin ? 15 : 9) : reportType === 'receipts' ? (isAdmin ? 15 : 8) : 6} className="px-4 py-12 text-center">
                      <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No data available for selected criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600">
                  {isAdmin && (reportType === 'summary' || reportType === 'receipts' || reportType === 'settlements') ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-sm font-bold text-gray-900 dark:text-white">
                        Grand Total ({filteredItems.length} records)
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-amber-500 dark:text-amber-300">AED {adminGrandTotals.receiptAmount.toFixed(2)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-300">AED {adminGrandTotals.bankCharges.toFixed(2)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-300">AED {adminGrandTotals.vat.toFixed(2)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-300">AED {adminGrandTotals.margin.toFixed(2)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-sky-600 dark:text-sky-300">AED {adminGrandTotals.toPay.toFixed(2)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-300">AED {adminGrandTotals.paid.toFixed(2)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-300">AED {adminGrandTotals.due.toFixed(2)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-300">AED {adminGrandTotals.netProfit.toFixed(2)}</td>
                      <td colSpan={3} />
                    </tr>
                  ) : !isAdmin && (reportType === 'summary' || reportType === 'receipts') ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-sm font-bold text-gray-900 dark:text-white">
                        Agent Grand Total ({filteredItems.length} records)
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-sky-600 dark:text-sky-300">AED {agentGrandTotals.toReceive.toFixed(2)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-300">AED {agentGrandTotals.received.toFixed(2)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-300">AED {agentGrandTotals.remainingReceive.toFixed(2)}</td>
                      <td colSpan={2} />
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={reportType === 'settlements' ? 3 : reportType === 'summary' ? 3 : reportType === 'receipts' ? 3 : 3} className="px-3 py-3 text-sm font-bold text-gray-900 dark:text-white">
                        Grand Total ({filteredItems.length} records)
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-primary">
                        {reportGrandTotal.toFixed(2)}
                      </td>
                      <td colSpan={reportType === 'settlements' ? 2 : reportType === 'summary' ? 5 : reportType === 'receipts' ? 3 : 2} />
                    </tr>
                  )}
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
