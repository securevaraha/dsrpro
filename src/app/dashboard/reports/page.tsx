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
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { TablePagination, getPaginatedSlice, getTotalPages } from '@/components/ui/table-pagination'

function safeAmount(value: number): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function formatAEDFull(value: number): string {
  const amount = safeAmount(value)
  return `AED ${amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatAED(value: number): string {
  const amount = safeAmount(value)
  const abs = Math.abs(amount)
  if (abs >= 1_000_000_000_000) return `AED ${(amount / 1_000_000_000_000).toFixed(2)}T`
  if (abs >= 1_000_000_000) return `AED ${(amount / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `AED ${(amount / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `AED ${(amount / 1_000).toFixed(2)}K`
  return formatAEDFull(amount)
}

function formatAmount(value: number): string {
  return safeAmount(value).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  const [dateRange, setDateRange] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportData, setReportData] = useState<any>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [tempFilters, setTempFilters] = useState<Record<string, string>>({})
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>({})
  const [agents, setAgents] = useState<{_id: string, name: string}[]>([])
  const [posMachines, setPosMachines] = useState<any[]>([])
  const [segments, setSegments] = useState<{_id: string, name: string}[]>([])
  const [brands, setBrands] = useState<{_id: string, name: string}[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => { fetchReportData() }, [reportType, dateRange, startDate, endDate])

  useEffect(() => {
    fetchWithAuth('/api/users?role=agent').then(r => r.ok ? r.json() : null).then(d => d && setAgents(d.users || []))
    fetchWithAuth('/api/pos-machines').then(r => r.ok ? r.json() : null).then(d => d && setPosMachines(d.machines || []))
    fetchWithAuth('/api/segments').then(r => r.ok ? r.json() : null).then(d => d && setSegments(d.segments || []))
    fetchWithAuth('/api/brands').then(r => r.ok ? r.json() : null).then(d => d && setBrands(d.brands || []))
    setPendingFilters(filters)
  }, [])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ type: reportType, range: dateRange, page: '1', limit: '5000' })
      if (dateRange === 'custom' && startDate) params.set('startDate', startDate)
      if (dateRange === 'custom' && endDate) params.set('endDate', endDate)
      const res = await fetchWithAuth(`/api/reports?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReportData(data)
        setTotalPages(1)
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
      const fmtDate = (d: any) => d ? format(new Date(d), 'dd-MMM-yyyy') : '—'
      const fmtDateTime = (d: any) => d ? format(new Date(d), 'dd-MMM-yyyy HH:mm') : '—'

      const normalizeRow = (r: any) => {
        const amount = Number(r.amount ?? r.posReceiptAmount ?? 0)
        const chargesPercent = Number(r.chargesPercent ?? r.marginPercent ?? r.commissionPercentage ?? 0)
        const bankChargesPercent = Number(r.bankChargesPercent ?? r.bankCharges ?? 0)
        const vatPercent = Number(r.vatPercent ?? r.vatPercentage ?? 0)
        const chargesAmount = Number(r.chargesAmount ?? ((amount * chargesPercent) / 100))
        const bankChargesAmount = Number(r.bankChargesAmount ?? ((amount * bankChargesPercent) / 100))
        const vatAmount = Number(r.vatAmount ?? ((bankChargesAmount * vatPercent) / 100))
        const netReceived = Number(r.netReceived ?? (amount - bankChargesAmount - vatAmount))
        const toPay = Number(r.toPayAmount ?? (amount - chargesAmount))
        const margin = Number(r.marginAmount ?? r.finalMargin ?? (netReceived - toPay))
        const received = Number(r.paid ?? r.paidAmount ?? 0)
        const settled = Number(r.settlementAmount ?? 0)
        const remaining = Math.max(0, Number(r.balance ?? r.dueAmount ?? (toPay - received - settled)))
        const batchId = r.batchId || r.receiptNumber || r.transactionId || '—'
        const posMachine = r.posMachine || (r.posMachineSegment && r.posMachineBrand ? `${r.posMachineSegment}/${r.posMachineBrand}` : 'No POS')
        const date = r.date || r.createdDate || r.createdAt

        return {
          batchId,
          agent: r.agent || 'System Agent',
          posMachine,
          date: fmtDate(date),
          description: r.description || '—',
          receiptAmount: Number(amount.toFixed(2)),
          amount: Number(amount.toFixed(2)),
          chargesPercent: Number(chargesPercent.toFixed(2)),
          charges: Number(chargesAmount.toFixed(2)),
          bankChargesPercent: Number(bankChargesPercent.toFixed(2)),
          bankCharges: Number(bankChargesAmount.toFixed(2)),
          vatPercent: Number(vatPercent.toFixed(2)),
          vat: Number(vatAmount.toFixed(2)),
          margin: Number(margin.toFixed(2)),
          netReceived: Number(netReceived.toFixed(2)),
          toPay: Number(toPay.toFixed(2)),
          paid: Number(received.toFixed(2)),
          balance: Number((remaining > 0.01 ? remaining : 0).toFixed(2)),
          toReceive: Number(toPay.toFixed(2)),
          received: Number(received.toFixed(2)),
          settlementAmount: Number(settled.toFixed(2)),
          remainingReceive: Number((remaining > 0.01 ? remaining : 0).toFixed(2)),
          due: Number((remaining > 0.01 ? remaining : 0).toFixed(2)),
          netProfit: Number((isAdmin ? margin : received).toFixed(2)),
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
              { key: 'chargesPercent', label: 'Charges %', width: 14 },
              { key: 'charges', label: 'Charges', width: 16 },
              { key: 'bankChargesPercent', label: 'Bank Charges %', width: 16 },
              { key: 'bankCharges', label: 'Bank Charges', width: 18 },
              { key: 'vatPercent', label: 'VAT %', width: 12 },
              { key: 'vat', label: 'VAT', width: 14 },
              { key: 'netReceived', label: 'Net Received', width: 18 },
              { key: 'toPay', label: 'To Pay', width: 18 },
              { key: 'margin', label: 'Margin', width: 20 },
              { key: 'paid', label: 'Paid', width: 18 },
              { key: 'balance', label: 'Balance', width: 18 },
              { key: 'createdByDate', label: 'Created By / Date', width: 30 },
              { key: 'updatedByDate', label: 'Updated By / Date', width: 30 },
              { key: 'description', label: 'Description', width: 40 },
            ]
          : [
              { key: 'batchId', label: 'Batch ID', width: 22 },
              { key: 'date', label: 'Date', width: 16 },
              { key: 'posMachine', label: 'POS Machine', width: 26 },
              { key: 'receiptAmount', label: 'Receipt Amount', width: 18 },
              { key: 'toReceive', label: 'To Receive', width: 18 },
              { key: 'received', label: 'Received', width: 18 },
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
              { key: 'chargesPercent', label: 'Charges %', width: 14 },
              { key: 'charges', label: 'Charges', width: 16 },
              { key: 'bankChargesPercent', label: 'Bank Charges %', width: 16 },
              { key: 'bankCharges', label: 'Bank Charges', width: 18 },
              { key: 'vatPercent', label: 'VAT %', width: 12 },
              { key: 'vat', label: 'VAT', width: 14 },
              { key: 'netReceived', label: 'Net Received', width: 18 },
              { key: 'toPay', label: 'To Pay', width: 18 },
              { key: 'margin', label: 'Margin', width: 20 },
              { key: 'paid', label: 'Paid', width: 18 },
              { key: 'balance', label: 'Balance', width: 18 },
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
        columns = [
          { key: 'batchId', label: 'Batch ID', width: 22 },
          { key: 'agent', label: 'Agent', width: 22 },
          { key: 'date', label: 'Date', width: 16 },
          { key: 'method', label: 'Method', width: 16 },
          { key: 'status', label: 'Status', width: 14 },
          { key: 'amount', label: 'Amount', width: 18 },
          { key: 'createdByDate', label: 'Created By / Date', width: 30 },
          { key: 'description', label: 'Description', width: 40 },
        ]
      } else if (reportType === 'payments') {
        columns = [
          { key: 'batchId', label: 'Batch ID', width: 22 },
          { key: 'agent', label: 'Agent', width: 22 },
          { key: 'date', label: 'Date', width: 16 },
          { key: 'method', label: 'Method', width: 16 },
          { key: 'status', label: 'Status', width: 14 },
          { key: 'amount', label: 'Amount', width: 18 },
          { key: 'createdByDate', label: 'Created By / Date', width: 30 },
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

      const getGrandTotalRow = (rows: any[]) => {
        if (reportType === 'summary' || reportType === 'receipts') {
          const totals = rows.reduce((acc: any, row: any) => {
            acc.receiptAmount += Number(row.receiptAmount || 0)
            acc.charges += Number(row.charges || 0)
            acc.bankCharges += Number(row.bankCharges || 0)
            acc.vat += Number(row.vat || 0)
            acc.netReceived += Number(row.netReceived || 0)
            acc.toPay += Number(row.toPay || 0)
            acc.margin += Number(row.margin || 0)
            acc.paid += Number(row.paid || 0)
            acc.balance += Number(row.balance || 0)
            acc.amount += Number(row.amount || 0)
            acc.toReceive += Number(row.toReceive || 0)
            acc.received += Number(row.received || 0)
            acc.remainingReceive += Number(row.remainingReceive || 0)
            return acc
          }, { receiptAmount: 0, charges: 0, bankCharges: 0, vat: 0, netReceived: 0, toPay: 0, margin: 0, paid: 0, balance: 0, amount: 0, toReceive: 0, received: 0, remainingReceive: 0 })
          return { label: `Grand Total (${rows.length} records)`, values: totals }
        }
        const total = rows.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
        return { label: `Grand Total (${rows.length} records)`, values: { amount: total } }
      }

      const getGrandTotalSummary = (rows: any[]) => undefined

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
            data: mapped,
            title: getDynamicExcelTitle(),
            grandTotals: { enabled: true, row: getGrandTotalRow(mapped) }
          },
          ...groupedEntries.map(([agentName, rows]) => ({
            sheetName: agentName.length > 25 ? `${agentName.slice(0, 25)}...` : agentName,
            data: rows,
            title: (() => { const rl = toTitleCase(reportType === 'summary' ? 'Summary Report' : reportType === 'receipts' ? 'Receipts Report' : reportType === 'payments' ? 'Payments Report' : 'Settlements Report'); return `${rl} - ${toTitleCase(agentName)} - ${toTitleCase(getDateRangeLabel())}` })(),
            grandTotals: { enabled: true, row: getGrandTotalRow(rows) }
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
          sheetName: toTitleCase(reportType + ' Report'),
          columns,
          data: mapped,
          title: getDynamicExcelTitle(),
          grandTotals: { enabled: true, row: getGrandTotalRow(mapped) },
          isRTL: false,
        })
      }

  toast.success(`Report exported (${mapped.length} records)`)
    } else {
      toast.success('PDF export functionality coming soon')
    }
  }

  const getDateRangeLabel = () => {
    const now = new Date()
    switch (dateRange) {
      case 'all': return 'All Time'
      case 'today': return 'Today'
      case 'week': return 'This Week'
      case 'month': return format(now, 'MMMM yyyy')
      case 'year': return format(now, 'yyyy')
      case 'custom':
        if (startDate && endDate) return `${format(new Date(startDate), 'dd-MMM-yyyy')} To ${format(new Date(endDate), 'dd-MMM-yyyy')}`
        return 'Custom Range'
      default: return 'All Time'
    }
  }

  const toTitleCase = (s: string) => s.replace(/[_-]+/g, ' ').trim().split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')

  const getAgentLabel = () => {
    if (!filters.agent || filters.agent === 'all') return 'All Agents'
    return agents.find(a => a._id === filters.agent)?.name || 'All Agents'
  }

  const getDynamicExcelTitle = () => {
    const reportLabel = toTitleCase(reportType === 'summary' ? 'Summary Report' : reportType === 'receipts' ? 'Receipts Report' : reportType === 'payments' ? 'Payments Report' : 'Settlements Report')
    const agentLabel = toTitleCase(getAgentLabel())
    const dateLabel = toTitleCase(getDateRangeLabel())
    return `${reportLabel} - ${agentLabel} - ${dateLabel}`
  }

  const getDynamicHeading = () => {
    const reportLabel = toTitleCase(reportType === 'summary' ? 'Summary Report' : reportType === 'receipts' ? 'Receipts Report' : reportType === 'payments' ? 'Payments Report' : 'Settlements Report')
    return `${reportLabel} - ${getDateRangeLabel()}`
  }

  const sourceItems = reportData?.allItems || reportData?.items || []

  const filteredItems = sourceItems.filter((item: any) => {
    const matchBatchId = !filters.batchId || (item.receiptNumber || item.transactionId || item.batchId || '').toLowerCase().includes(filters.batchId.toLowerCase())
    const matchAgent = !filters.agent || filters.agent === 'all' || item.agentId === filters.agent || item.agent === agents.find(a => a._id === filters.agent)?.name
    const matchPOS = !filters.posMachine || filters.posMachine === 'all' || item.posMachineId === filters.posMachine
    const matchSegment = !filters.segment || filters.segment === 'all' || item.posMachineSegment === filters.segment || (item.posMachine || '').startsWith(filters.segment)
    const matchBrand = !filters.brand || filters.brand === 'all' || item.posMachineBrand === filters.brand || (item.posMachine || '').includes(filters.brand)
    const iDate = item.date ? new Date(item.date) : null
    const matchFrom = !filters.dateFrom || !iDate || iDate >= new Date(filters.dateFrom)
    const matchTo = !filters.dateTo || !iDate || iDate <= new Date(filters.dateTo + 'T23:59:59')
    return matchBatchId && matchAgent && matchPOS && matchSegment && matchBrand && matchFrom && matchTo
  })

  // Filter POS machines based on selected segment and brand
  const filteredPosMachines = posMachines.filter((machine: any) => {
    const segmentMatch = !pendingFilters.segment || pendingFilters.segment === 'all' || machine.segment === pendingFilters.segment
    const brandMatch = !pendingFilters.brand || pendingFilters.brand === 'all' || machine.brand === pendingFilters.brand
    return segmentMatch && brandMatch
  })

  // Filter agents based on selected POS machine (if applicable)
  const filteredAgents = agents.filter((agent: any) => {
    if (!pendingFilters.posMachine || pendingFilters.posMachine === 'all') return true
    const selectedMachine = posMachines.find(m => m._id === pendingFilters.posMachine)
    if (!selectedMachine) return true
    return selectedMachine.assignedAgent === agent._id || !selectedMachine.assignedAgent
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [reportType, dateRange, filters, itemsPerPage])

  const paginatedFilteredItems = getPaginatedSlice(filteredItems, currentPage, itemsPerPage)
  const computedTotalPages = getTotalPages(filteredItems.length, itemsPerPage)

  useEffect(() => {
    if (currentPage > computedTotalPages) {
      setCurrentPage(computedTotalPages)
    }
  }, [currentPage, computedTotalPages])

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
    const chargesPercent = Number(item.chargesPercent ?? item.marginPercent ?? item.commissionPercentage ?? 0)
    const bankChargesPercent = Number(item.bankChargesPercent ?? item.bankCharges ?? 0)
    const vatPercent = Number(item.vatPercent ?? item.vatPercentage ?? 0)
    const chargesAmount = Number(item.chargesAmount ?? ((amount * chargesPercent) / 100))
    const bankChargesAmount = Number(item.bankChargesAmount ?? ((amount * bankChargesPercent) / 100))
    const vatAmount = Number(item.vatAmount ?? ((bankChargesAmount * vatPercent) / 100))
    const netReceived = Number(item.netReceived ?? (amount - bankChargesAmount - vatAmount))
    const toReceive = Number(item.toPayAmount ?? (amount - chargesAmount))
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
          fullValue: formatAEDFull(filteredStats.totalRevenue),
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
          fullValue: formatAEDFull(filteredStats.totalBankCharges),
          icon: Calculator,
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
        },
        {
          label: 'Total Margin',
          value: formatAED(filteredStats.totalMargin),
          fullValue: formatAEDFull(filteredStats.totalMargin),
          icon: FileText,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          label: 'Total VAT',
          value: formatAED(filteredStats.totalVAT),
          fullValue: formatAEDFull(filteredStats.totalVAT),
          icon: Calculator,
          color: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
          label: 'Total Margin',
          value: formatAED(filteredStats.totalMargin),
          fullValue: formatAEDFull(filteredStats.totalMargin),
          icon: TrendingUp,
          color: 'text-cyan-600 dark:text-cyan-400',
          bg: 'bg-cyan-50 dark:bg-cyan-900/20',
        },
      ]
    : [
        {
          label: 'Total Receipt Amount',
          value: formatAED(agentCardTotals.totalReceiptAmount),
          fullValue: formatAEDFull(agentCardTotals.totalReceiptAmount),
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
          label: 'To Receive',
          value: formatAED(agentCardTotals.toReceive),
          fullValue: formatAEDFull(agentCardTotals.toReceive),
          icon: Calculator,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          label: 'Received',
          value: formatAED(agentCardTotals.received),
          fullValue: formatAEDFull(agentCardTotals.received),
          icon: FileText,
          color: 'text-indigo-600 dark:text-indigo-400',
          bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        },
        {
          label: 'Settlement Amount',
          value: formatAED(agentCardTotals.settled),
          fullValue: formatAEDFull(agentCardTotals.settled),
          icon: TrendingUp,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        },
        {
          label: 'Remaining Receive',
          value: formatAED(agentCardTotals.remainingReceive),
          fullValue: formatAEDFull(agentCardTotals.remainingReceive),
          icon: FileText,
          color: 'text-indigo-600 dark:text-indigo-400',
          bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        },
      ]

  const reportGrandTotal = filteredItems.reduce((s: number, item: any) => s + (item.amount || 0), 0)

  const adminGrandTotals = filteredItems.reduce((acc: any, item: any) => {
    const amount = Number(item.amount ?? item.posReceiptAmount ?? 0)
    const chargesPercent = Number(item.chargesPercent ?? item.marginPercent ?? item.commissionPercentage ?? 0)
    const bankChargesPercent = Number(item.bankChargesPercent ?? item.bankCharges ?? 0)
    const vatPercent = Number(item.vatPercent ?? item.vatPercentage ?? 0)
    const chargesAmount = Number(item.chargesAmount ?? ((amount * chargesPercent) / 100))
    const bankChargesAmount = Number(item.bankChargesAmount ?? ((amount * bankChargesPercent) / 100))
    const vatAmount = Number(item.vatAmount ?? ((bankChargesAmount * vatPercent) / 100))
    const netReceived = Number(item.netReceived ?? (amount - bankChargesAmount - vatAmount))
    const toPayAmount = Number(item.toPayAmount ?? (amount - chargesAmount))
    const marginAmount = Number(item.marginAmount ?? item.finalMargin ?? (netReceived - toPayAmount))
    const paidAmount = Number(item.paid ?? item.paidAmount ?? 0)
    const dueAmount = Number(item.balance ?? item.dueAmount ?? (toPayAmount - paidAmount))

    acc.receiptAmount += amount
    acc.charges += chargesAmount
    acc.bankCharges += bankChargesAmount
    acc.vat += vatAmount
    acc.netReceived += netReceived
    acc.margin += marginAmount
    acc.toPay += toPayAmount
    acc.paid += paidAmount
    acc.balance += Math.max(0, dueAmount)
    return acc
  }, {
    receiptAmount: 0,
    charges: 0,
    bankCharges: 0,
    vat: 0,
    netReceived: 0,
    margin: 0,
    toPay: 0,
    paid: 0,
    balance: 0,
  })

  const agentGrandTotals = filteredItems.reduce((acc: any, item: any) => {
    const amount = Number(item.amount ?? item.posReceiptAmount ?? 0)
    const chargesPercent = Number(item.chargesPercent ?? item.marginPercent ?? item.commissionPercentage ?? 0)
    const bankChargesPercent = Number(item.bankChargesPercent ?? item.bankCharges ?? 0)
    const vatPercent = Number(item.vatPercent ?? item.vatPercentage ?? 0)
    const chargesAmount = Number(item.chargesAmount ?? ((amount * chargesPercent) / 100))
    const bankChargesAmount = Number(item.bankChargesAmount ?? ((amount * bankChargesPercent) / 100))
    const vatAmount = Number(item.vatAmount ?? ((bankChargesAmount * vatPercent) / 100))
    const toReceive = Number(item.toPayAmount ?? (amount - chargesAmount))
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
    { key: 'segment', label: 'Segment', type: 'select' as const, options: [
      { value: 'all', label: 'All Segments' },
      ...segments.map(s => ({ value: s.name, label: s.name }))
    ]},
    { key: 'brand', label: 'Company/Brand', type: 'select' as const, options: [
      { value: 'all', label: 'All Company/Brands' },
      ...brands.map(b => ({ value: b.name, label: b.name }))
    ]},
    { key: 'posMachine', label: 'POS Machine', type: 'select' as const, options: [
      { value: 'all', label: 'All POS Machines' },
      ...posMachines.map(m => ({ value: m._id, label: m.machineName || `${m.segment} / ${m.brand} — ${m.terminalId}` }))
    ]},
    { key: 'agent', label: 'Agent', type: 'select' as const, options: [
      { value: 'all', label: 'All Agents' },
      ...agents.map(a => ({ value: a._id, label: a.name }))
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
          {/* Mobile Filter Button */}
          <div className="md:hidden">
            <FilterButton onClick={() => { setPendingFilters(filters); setShowFilter(true) }} activeCount={activeFilterCount} />
          </div>
        </div>
      </div>

      <FilterPanel
        open={showFilter}
        onClose={() => {
          setPendingFilters(filters)
          setShowFilter(false)
        }}
        fields={filterFields}
        values={pendingFilters}
        onChange={(key, value) => setPendingFilters(prev => ({ ...prev, [key]: value }))}
        onApply={() => {
          setFilters(pendingFilters)
          setShowFilter(false)
          setCurrentPage(1)
        }}
        onReset={() => { setPendingFilters({}); setFilters({}) }}
        activeCount={activeFilterCount}
      />

      {/* Filters */}
      <div className="space-y-4">
        {/* Main Report Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Report Type
            </label>
            <SearchableSelect
              value={reportType}
              onChange={(value) => setReportType(value)}
              options={[
                { value: 'summary', label: 'Summary Report' },
                { value: 'receipts', label: 'Receipts Report' },
                { value: 'payments', label: 'Payments Report' },
                { value: 'settlements', label: 'Settlements Report' },
              ]}
              placeholder="Select Report Type"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Date Range
            </label>
            <SearchableSelect
              value={dateRange}
              onChange={(value) => setDateRange(value)}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: t('monthlyReport') },
                { value: 'year', label: t('yearlyReport') },
                { value: 'custom', label: 'Custom Range' },
              ]}
              placeholder="Select Date Range"
            />
          </div>
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Start Date
                </label>
                <DatePicker 
                  placeholder="Select Start Date" 
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  End Date
                </label>
                <DatePicker 
                  placeholder="Select End Date" 
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

        {/* Desktop Additional Filters - Always Visible */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Batch ID
            </label>
            <input
              type="text"
              placeholder="Filter by batch ID..."
              className="form-input text-sm"
              value={pendingFilters.batchId || ''}
              onChange={(e) => setPendingFilters(prev => ({ ...prev, batchId: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Segment
            </label>
            <SearchableSelect
              className="text-sm"
              value={pendingFilters.segment || 'all'}
              onChange={(value) => {
                setPendingFilters(prev => ({ 
                  ...prev, 
                  segment: value,
                  brand: value === 'all' ? 'all' : prev.brand,
                  posMachine: 'all',
                  agent: 'all'
                }))
              }}
              options={[
                { value: 'all', label: 'All Segments' },
                ...segments.map(s => ({ value: s.name, label: s.name }))
              ]}
              placeholder="Select Segment"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Brand
            </label>
            <SearchableSelect
              className="text-sm"
              value={pendingFilters.brand || 'all'}
              onChange={(value) => {
                setPendingFilters(prev => ({ 
                  ...prev, 
                  brand: value,
                  posMachine: 'all',
                  agent: 'all'
                }))
              }}
              options={[
                { value: 'all', label: 'All Brands' },
                ...brands.filter(b => !pendingFilters.segment || pendingFilters.segment === 'all' || 
                  posMachines.some(m => m.segment === pendingFilters.segment && m.brand === b.name)
                ).map(b => ({ value: b.name, label: b.name }))
              ]}
              placeholder="Select Brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              POS Machine
            </label>
            <SearchableSelect
              className="text-sm"
              value={pendingFilters.posMachine || 'all'}
              onChange={(value) => {
                setPendingFilters(prev => ({ 
                  ...prev, 
                  posMachine: value,
                  agent: 'all'
                }))
              }}
              options={[
                { value: 'all', label: 'All POS Machines' },
                ...filteredPosMachines.map(m => ({ 
                  value: m._id, 
                  label: `${m.machineName || 'Unnamed'} | ${m.segment}/${m.brand} | Terminal: ${m.terminalId} | Merchant: ${m.merchantId || 'N/A'}` 
                }))
              ]}
              placeholder="Select POS Machine"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Agent
            </label>
            <SearchableSelect
              className="text-sm"
              value={pendingFilters.agent || 'all'}
              onChange={(value) => setPendingFilters(prev => ({ ...prev, agent: value }))}
              options={[
                { value: 'all', label: 'All Agents' },
                ...filteredAgents.map(a => ({ value: a._id, label: a.name }))
              ]}
              placeholder="Select Agent"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setFilters(pendingFilters)
                setCurrentPage(1)
              }}
              className="dubai-button text-sm px-4 py-2"
            >
              Apply Filters
            </button>
            {(Object.values(filters).some(v => v && v !== 'all') || Object.values(pendingFilters).some(v => v && v !== 'all')) && (
              <button
                onClick={() => {
                  setFilters({})
                  setPendingFilters({})
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors px-3 py-2 rounded-lg border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:hover:border-red-700"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid">
        {summaryCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={`${card.label}-${index}`} className="kpi-card">
              <div className={`kpi-card-icon ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="kpi-card-body">
                <span className="kpi-card-label">{card.label}</span>
                <span className="kpi-card-value" title={loading ? '' : (card.fullValue || String(card.value))}>
                  {loading
                    ? <span className="inline-block h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    : card.value
                  }
                </span>
                {!loading && card.fullValue && card.fullValue !== card.value && (
                  <span className="kpi-card-subvalue" title={card.fullValue}>{card.fullValue}</span>
                )}
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
          <div className="p-5"><TableSkeleton rows={5} columns={isAdmin && (reportType === 'summary' || reportType === 'receipts' || reportType === 'settlements') ? 19 : (reportType === 'summary' || reportType === 'receipts' ? 8 : 6)} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {(reportType === 'settlements' ? (
                    isAdmin ? [
                      'Batch ID', 'Agent', 'POS Machine', 'Date', 'Receipt Amount',
                      'Charges %', 'Charges', 'Bank Charges %', 'Bank Charges', 'Vat %', 'Vat', 'Net Received', 'To Pay', 'Margin', 'Paid', 'Balance',
                      'Created By / Date', 'Updated By / Date', 'Description'
                    ] : [
                      'Batch ID', 'Date', 'POS Machine', 'POS/Receipt Amount', 'Net Received', 'Description'
                    ]
                  ) : reportType === 'summary' ? (
                    isAdmin ? [
                      'Batch ID', 'Agent', 'POS Machine', 'Date', 'Receipt Amount',
                      'Charges %', 'Charges', 'Bank Charges %', 'Bank Charges', 'Vat %', 'Vat', 'Net Received', 'To Pay', 'Margin', 'Paid', 'Balance',
                      'Created By / Date', 'Updated By / Date', 'Description'
                    ] : [
                      'Batch ID', 'Date', 'POS Machine', 'Receipt Amount', 'To Receive', 'Received', 'Remaining Receive', 'Description'
                    ]
                  ) : reportType === 'receipts' ? (
                    isAdmin ? [
                      'Batch ID', 'Agent', 'POS Machine', 'Date', 'Receipt Amount',
                      'Charges %', 'Charges', 'Bank Charges %', 'Bank Charges', 'Vat %', 'Vat', 'Net Received', 'To Pay', 'Margin', 'Paid', 'Balance',
                      'Created By / Date', 'Updated By / Date', 'Description'
                    ] : [
                      'Batch ID', 'Date', 'POS Machine', 'Receipt Amount', 'To Receive', 'Received', 'Remaining Receive', 'Description'
                    ]
                  ) : [
                    'Batch ID', 'Agent', 'Date', 'Method', 'Status', 'Amount', 'Created By / Date', 'Description'
                  ]).map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedFilteredItems.length > 0 ? paginatedFilteredItems.map((item: any, i: number) => {
                  if (isAdmin && (reportType === 'summary' || reportType === 'receipts' || reportType === 'settlements')) {
                    const amount = Number(item.amount ?? item.posReceiptAmount ?? 0)
                    const chargesPercent = Number(item.chargesPercent ?? item.marginPercent ?? item.commissionPercentage ?? 0)
                    const bankChargesPercent = Number(item.bankChargesPercent ?? item.bankCharges ?? 0)
                    const vatPercent = Number(item.vatPercent ?? item.vatPercentage ?? 0)
                    const chargesAmount = Number(item.chargesAmount ?? ((amount * chargesPercent) / 100))
                    const bankChargesAmount = Number(item.bankChargesAmount ?? ((amount * bankChargesPercent) / 100))
                    const vatAmount = Number(item.vatAmount ?? ((bankChargesAmount * vatPercent) / 100))
                    const netReceived = Number(item.netReceived ?? (amount - bankChargesAmount - vatAmount))
                    const toPayAmount = Number(item.toPayAmount ?? (amount - chargesAmount))
                    const marginAmount = Number(item.marginAmount ?? item.finalMargin ?? (netReceived - toPayAmount))
                    const paidAmount = Number(item.paid ?? item.paidAmount ?? 0)
                    const dueAmount = Number(item.balance ?? item.dueAmount ?? (toPayAmount - paidAmount))
                    const isFullyPaid = paidAmount >= toPayAmount - 0.01
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
                        <td className="px-3 py-3 text-sm font-semibold text-amber-500 dark:text-amber-300 whitespace-nowrap">{formatAmount(amount)}</td>
                        <td className="px-3 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-300 whitespace-nowrap">{chargesPercent.toFixed(2)}%</td>
                        <td className="px-3 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-300 whitespace-nowrap">{formatAmount(chargesAmount)}</td>
                        <td className="px-3 py-3 text-sm font-medium text-rose-600 dark:text-rose-300 whitespace-nowrap">{bankChargesPercent.toFixed(2)}%</td>
                        <td className="px-3 py-3 text-sm font-medium text-rose-600 dark:text-rose-300 whitespace-nowrap">{formatAmount(bankChargesAmount)}</td>
                        <td className="px-3 py-3 text-sm font-medium text-rose-600 dark:text-rose-300 whitespace-nowrap">{vatPercent.toFixed(2)}%</td>
                        <td className="px-3 py-3 text-sm font-medium text-rose-600 dark:text-rose-300 whitespace-nowrap">{formatAmount(vatAmount)}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300 whitespace-nowrap">{formatAmount(netReceived)}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-sky-600 dark:text-sky-300 whitespace-nowrap">{formatAmount(toPayAmount)}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300 whitespace-nowrap">{formatAmount(marginAmount)}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300 whitespace-nowrap">{isFullyPaid ? formatAmount(toPayAmount) : (paidAmount > 0 ? formatAmount(paidAmount) : '—')}</td>
                        <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap">
                          <span className={dueAmount > 0.01 ? 'text-red-600' : 'text-green-600'}>{formatAmount(Math.max(0, dueAmount))}</span>
                        </td>
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
                    const batchId = item.batchId || item.receiptNumber || item.transactionId || '—'
                    const posAmount = Number(item.amount ?? item.posReceiptAmount ?? 0)
                    const chargesPercent = Number(item.chargesPercent ?? item.marginPercent ?? item.commissionPercentage ?? 0)
                    const bankChargesPercent = Number(item.bankChargesPercent ?? item.bankCharges ?? 0)
                    const vatPercent = Number(item.vatPercent ?? item.vatPercentage ?? 0)
                    const chargesAmount = Number(item.chargesAmount ?? ((posAmount * chargesPercent) / 100))
                    const bankChargesAmount = Number(item.bankChargesAmount ?? ((posAmount * bankChargesPercent) / 100))
                    const vatAmount = Number(item.vatAmount ?? ((bankChargesAmount * vatPercent) / 100))
                    const netReceived = Number(item.netReceived ?? (posAmount - bankChargesAmount - vatAmount))
                    const toPayAmount = Number(item.toPayAmount ?? (posAmount - chargesAmount))

                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{batchId}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.posMachine || 'N/A'}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                          {formatAmount(posAmount)}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">
                          {formatAmount(toPayAmount)}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">
                          {formatAmount(netReceived)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {item.description || '—'}
                        </td>
                      </tr>
                    )
                  } else if (reportType === 'receipts') {
                    const amount = item.amount || 0
                    // Use flat fields sent directly from the API
                    const chargesPercent = item.chargesPercent ?? item.commissionPercentage ?? 0
                    const bankChargesPercent = item.bankCharges ?? 0
                    const vatPercent = item.vatPercentage ?? 0
                    const chargesAmount = amount * chargesPercent / 100
                    const bankChargesAmount = (amount * bankChargesPercent) / 100
                    const vatAmount = (bankChargesAmount * vatPercent) / 100
                    const netReceived = amount - bankChargesAmount - vatAmount
                    const toPayAmount = amount - chargesAmount
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
                            {item.posMachine || (item.posMachineSegment && item.posMachineBrand ? `${item.posMachineSegment}/${item.posMachineBrand}` : 'No POS')}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">{formatAmount(amount)}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{chargesPercent > 0 ? `${chargesPercent}%` : '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{chargesAmount > 0 ? formatAmount(chargesAmount) : '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{bankChargesPercent > 0 ? `${bankChargesPercent}%` : '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{bankChargesAmount > 0 ? formatAmount(bankChargesAmount) : '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{vatPercent > 0 ? `${vatPercent}%` : '—'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{vatAmount > 0 ? formatAmount(vatAmount) : '—'}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-emerald-600 whitespace-nowrap">{formatAmount(netReceived)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">{formatAmount(toPayAmount)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">{paidAmount > 0 ? formatAmount(paidAmount) : '—'}</td>
                          <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap">
                            <span className={dueAmount > 0.01 ? 'text-red-600' : 'text-green-600'}>{formatAmount(Math.max(0, dueAmount))}</span>
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
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.posMachine || (item.posMachineSegment && item.posMachineBrand ? `${item.posMachineSegment}/${item.posMachineBrand}` : 'No POS')}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">{formatAmount(amount)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">{formatAmount(toPayAmount)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">{paidAmount > 0 ? formatAmount(paidAmount) : '—'}</td>
                          <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap">
                            <span className={dueAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                              {dueAmount > 0 ? formatAmount(dueAmount) : (settledAmount > 0.01 && paidAmount < toPayAmount - 0.01 ? '✓ Settled' : '✓ Received')}
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
                    const chargesPercent = item.chargesPercent || item.marginPercent || 0
                    const chargesAmount = item.chargesAmount || (posAmount * chargesPercent) / 100
                    const bankChargesPercent = item.bankChargesPercent || 0
                    const bankChargesAmount = item.bankChargesAmount || 0
                    const vatPercent = item.vatPercent || 0
                    const vatAmount = item.vatAmount || 0
                    const netReceived = item.netReceived ?? (posAmount - bankChargesAmount - vatAmount)
                    const toPayAmount = item.toPayAmount ?? (posAmount - chargesAmount)
                    const paid = item.paid || 0
                    const settled = item.settlementAmount || 0
                    const due = item.balance ?? (toPayAmount - paid - settled)
                    
                    if (isAdmin) {
                      return (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{batchId}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.agent || 'System Agent'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.posMachine || 'No POS'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : (item.createdAt ? format(new Date(item.createdAt), 'dd-MMM-yyyy') : '—')}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                            {posAmount.toFixed(0)}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {chargesPercent > 0 ? chargesPercent.toFixed(2) : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {chargesAmount > 0 ? chargesAmount.toFixed(2) : '—'}
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
                            <span className={due > 0.01 ? 'text-red-600' : 'text-green-600'}>{formatAmount(Math.max(0, due))}</span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.createdBy || 'System'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.updatedBy || 'System'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.createdDate ? format(new Date(item.createdDate), 'dd-MMM-yyyy HH:mm') : (item.createdAt ? format(new Date(item.createdAt), 'dd-MMM-yyyy HH:mm') : '—')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.updatedDate ? format(new Date(item.updatedDate), 'dd-MMM-yyyy HH:mm') : (item.updatedAt ? format(new Date(item.updatedAt), 'dd-MMM-yyyy HH:mm') : '—')}
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
                            {item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : (item.createdAt ? format(new Date(item.createdAt), 'dd-MMM-yyyy') : '—')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {item.posMachine || 'No POS'}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                            {posAmount.toFixed(0)}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">
                            {formatAmount(toPayAmount)}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">
                            {paid > 0 ? formatAmount(paid) : '—'}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap">
                            <span className={due > 0.01 ? 'text-red-600' : 'text-green-600'}>
                              {due > 0.01 ? formatAmount(due) : (settled > 0.01 && paid < toPayAmount - 0.01 ? '✓ Settled' : '✓ Received')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {item.description || '—'}
                          </td>
                        </tr>
                      )
                    }
                  } else {
                    // Payments and Settlements report types — match their respective pages
                    const batchId = item.batchId || item.receiptNumber || item.transactionId || '—'
                    const itemDate = item.date || item.createdAt
                    const methodColor: Record<string, string> = {
                      cash: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
                      bank: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
                      upi: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
                      card: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
                    }
                    const method = (item.paymentMethod || item.method || '').toLowerCase()
                    const status = String(item.status || 'completed').toLowerCase()
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{batchId}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.agent || '—'}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.posMachine || (item.posMachineSegment && item.posMachineBrand ? `${item.posMachineSegment}/${item.posMachineBrand}` : 'No POS')}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {itemDate ? format(new Date(itemDate), 'dd-MMM-yyyy') : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${methodColor[method] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {method.toUpperCase() || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            status === 'completed' || status === 'settled' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                            status === 'due' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                          }`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                          {formatAmount(item.amount || 0)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          <div className="meta-compact">
                            <div className="meta-compact-name">{item.createdBy || 'System'}</div>
                            <div className="meta-compact-date">{item.createdDate || item.createdAt ? format(new Date(item.createdDate || item.createdAt), 'dd-MMM-yyyy HH:mm') : '—'}</div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{item.description || '—'}</td>
                      </tr>
                    )
                  }
                }) : (
                  <tr>
                    <td colSpan={reportType === 'settlements' ? (isAdmin ? 19 : 6) : reportType === 'summary' ? (isAdmin ? 19 : 8) : reportType === 'receipts' ? (isAdmin ? 18 : 8) : 9} className="px-4 py-12 text-center">
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
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-amber-500 dark:text-amber-300">{formatAmount(adminGrandTotals.receiptAmount)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-300">—</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-300">{formatAmount(adminGrandTotals.charges)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-300">—</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-300">{formatAmount(adminGrandTotals.bankCharges)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-300">—</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-300">{formatAmount(adminGrandTotals.vat)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-300">{formatAmount(adminGrandTotals.netReceived)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-sky-600 dark:text-sky-300">{formatAmount(adminGrandTotals.toPay)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-300">{formatAmount(adminGrandTotals.margin)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-300">{formatAmount(adminGrandTotals.paid)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-300">{formatAmount(adminGrandTotals.balance)}</td>
                      <td colSpan={3} />
                    </tr>
                  ) : !isAdmin && (reportType === 'summary' || reportType === 'receipts') ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-sm font-bold text-gray-900 dark:text-white">
                        Agent Grand Total ({filteredItems.length} records)
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-sky-600 dark:text-sky-300">{formatAmount(agentGrandTotals.toReceive)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-300">{formatAmount(agentGrandTotals.received)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-300">{formatAmount(agentGrandTotals.remainingReceive)}</td>
                      <td colSpan={1} />
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-sm font-bold text-gray-900 dark:text-white">
                        Grand Total ({filteredItems.length} records)
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-primary">
                        {reportGrandTotal.toFixed(2)}
                      </td>
                      <td colSpan={4} />
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && filteredItems.length > 0 && (
          <TablePagination
            totalItems={filteredItems.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </div>
    </div>
  )
}
