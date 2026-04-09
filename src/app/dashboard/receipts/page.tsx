'use client'
import { useState, useEffect, useRef } from 'react'
import { Plus, Download, Eye, Edit, Trash2, Receipt, Search, Filter, Upload, File, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { ImagePreviewModal } from '@/components/ImagePreviewModal'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { DatePicker } from '@/components/ui/date-picker'
import { FilterPanel, FilterButton } from '@/components/ui/filter-panel'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { TablePagination, getPaginatedSlice, getTotalPages } from '@/components/ui/table-pagination'
import { matchesDateRange } from '@/lib/date-range'
import { DateRangeFilter } from '@/components/ui/date-range-filter'

interface Receipt {
  _id: string
  receiptNumber: string
  agent?: string
  date: string
  posMachine: {
    _id: string
    segment: string
    brand: string
    terminalId: string
    bankCharges?: number
    vatPercentage?: number
    commissionPercentage?: number
  } | null
  amount: number
  description: string
  attachments?: string[]
  createdBy?: string
  updatedBy?: string
  updatedAt?: string
  createdAt?: string
}

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Receipts() {
  const { t } = useLanguage()
  const { user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [posMachines, setPosMachines] = useState<any[]>([])
  const [agents, setAgents] = useState<{_id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [deletingReceipt, setDeletingReceipt] = useState<Receipt | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [tempFilters, setTempFilters] = useState<Record<string, string>>({})
  const [dateRangeFilter, setDateRangeFilter] = useState('all')
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImage, setPreviewImage] = useState({ url: '', fileName: '' })
  const [formData, setFormData] = useState({
    receiptNumber: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    posMachine: '',
    agentId: '',
    amount: '',
    description: '',
  })

  useEffect(() => {
    fetchReceipts()
    fetchPosMachines()
    if (isAdmin) fetchAgents()
  }, [user, isAdmin])

  // Paste image support
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (!showModal) return
      const items = e.clipboardData?.items
      if (!items) return
      const imageItem = Array.from(items).find(i => i.type.startsWith('image/'))
      if (!imageItem) return
      const file = imageItem.getAsFile()
      if (!file) return
      const dt = new DataTransfer()
      dt.items.add(file)
      handleFileUpload(dt.files)
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [showModal, uploadedFiles])

  const fetchReceipts = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth('/api/transactions?type=receipt&limit=500')
      if (response.ok) {
        const data = await response.json()
        const formattedReceipts = data.transactions.map((t: any) => ({
          _id: t._id,
          receiptNumber: t.transactionId,
          agent: t.agentId?.name || '—',
          date: t.date || t.createdAt,
          posMachine: t.posMachine || null,
          amount: t.amount,
          description: t.description || 'Transaction',
          attachments: t.attachments || [],
          createdBy: t.createdBy?.name || '—',
          updatedBy: t.updatedBy?.name || '—',
          updatedAt: t.updatedAt,
          createdAt: t.createdAt
        })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setReceipts(formattedReceipts)
      }
    } catch (error) {
      console.error('Failed to fetch receipts:', error)
      toast.error('Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetchWithAuth('/api/users?role=agent')
      if (response.ok) {
        const data = await response.json()
        setAgents(data.users || [])
      }
    } catch {}
  }

  const fetchPosMachines = async () => {
    try {
      const response = await fetchWithAuth('/api/pos-machines')
      if (response.ok) {
        const data = await response.json()
        setPosMachines(data.machines || [])
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch POS machines:', errorData)
      }
    } catch (error) {
      console.error('Failed to fetch POS machines:', error)
    }
  }

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return
    
    // Only allow one file at a time
    if (uploadedFiles.length > 0) {
      toast.error('Please remove the existing file before uploading a new one')
      return
    }
    
    setUploading(true)
    const file = files[0] // Only take the first file
    
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File ${file.name} is not supported. Please upload images or PDF files.`)
        return
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 5MB.`)
        return
      }
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const result = await response.json()
        setUploadedFiles([result.url]) // Replace existing file
        toast.success('File uploaded successfully')
      } else {
        const error = await response.json()
        toast.error(`Failed to upload ${file.name}: ${error.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const getAttachmentBaseUrl = (url: string) => url.split('?')[0]

  const getAttachmentFileName = (url: string, fallback: string) => {
    const fileName = getAttachmentBaseUrl(url).split('/').pop() || fallback
    try {
      return decodeURIComponent(fileName)
    } catch {
      return fileName
    }
  }

  const isImageAttachment = (value: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(getAttachmentBaseUrl(value))

  const getAttachmentViewUrl = (url: string, download = false) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return `/api/upload/file?url=${encodeURIComponent(url)}${download ? '&download=1' : ''}`
    }
    return url
  }
  
  const handleImagePreview = (url: string, fileName: string) => {
    const isImage = isImageAttachment(fileName || url)
    const viewUrl = getAttachmentViewUrl(url)
    if (isImage) {
      setPreviewImage({ url: viewUrl, fileName })
      setShowImagePreview(true)
    } else {
      // For PDFs, still open in new tab
      window.open(viewUrl, '_blank')
    }
  }
  const removeUploadedFile = (url: string) => {
    setUploadedFiles(prev => prev.filter(f => f !== url))
  }
  
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBatchId = !filters.batchId || receipt.receiptNumber.toLowerCase().includes(filters.batchId.toLowerCase())
    const matchesPOS = !filters.posMachine || filters.posMachine === 'all' || receipt.posMachine?._id === filters.posMachine
    const matchesAgent = !filters.agent || filters.agent === 'all' || (receipt as any).agentId === filters.agent
    const matchesDateRng = matchesDateRange(receipt.date, dateRangeFilter, dateRangeStart, dateRangeEnd)
    return matchesSearch && matchesBatchId && matchesPOS && matchesAgent && matchesDateRng
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filters, receipts, itemsPerPage, dateRangeFilter, dateRangeStart, dateRangeEnd])

  const paginatedReceipts = getPaginatedSlice(filteredReceipts, currentPage, itemsPerPage)
  const totalPages = getTotalPages(filteredReceipts.length, itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const grandTotalCharges = filteredReceipts.reduce((s, r) => s + (r.posMachine?.commissionPercentage != null ? r.amount * r.posMachine.commissionPercentage / 100 : 0), 0)
  const grandTotalBankCharges = filteredReceipts.reduce((s, r) => s + (r.posMachine?.bankCharges != null ? r.amount * r.posMachine.bankCharges / 100 : 0), 0)
  const grandTotalVat = filteredReceipts.reduce((s, r) => {
    const bc = r.posMachine?.bankCharges != null ? r.amount * r.posMachine.bankCharges / 100 : 0
    return s + (r.posMachine?.vatPercentage != null ? bc * r.posMachine.vatPercentage / 100 : 0)
  }, 0)
  const grandTotal = filteredReceipts.reduce((s, r) => s + r.amount, 0)

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length

  const filterFields = [
    { key: 'batchId', label: 'Batch ID', type: 'text' as const, placeholder: 'Filter by batch ID...' },
    { key: 'posMachine', label: 'POS Machine', type: 'select' as const, options: [
      { value: 'all', label: 'All POS Machines' },
      ...posMachines.map(m => ({ value: m._id, label: `${m.segment} / ${m.brand} — ${m.terminalId}` }))
    ]},
    ...(isAdmin ? [{ key: 'agent', label: 'Agent', type: 'select' as const, options: [
      { value: 'all', label: 'All Agents' },
      ...agents.map(a => ({ value: a._id, label: a.name }))
    ]}] : []),
  ]

  const availablePosMachines = posMachines.filter((m: any) => {
    const isCurrent = m._id === formData.posMachine
    const isActive = m.status === 'active'
    if (!isCurrent && !isActive) return false

    if (isAdmin && !editingReceipt && !formData.agentId) return false
    if (!isAdmin || !formData.agentId) return true

    const assignedId = typeof m.assignedAgent === 'string'
      ? m.assignedAgent
      : m.assignedAgent?._id

    return assignedId === formData.agentId
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mandatory fields for receipt creation
    if (!formData.receiptNumber.trim()) {
      toast.error('Batch ID is mandatory')
      return
    }

    if (isAdmin && !editingReceipt && !formData.agentId) {
      toast.error('Agent is mandatory')
      return
    }

    if (!formData.posMachine) {
      toast.error('POS Machine is mandatory')
      return
    }

    const amountValue = parseFloat(formData.amount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    // Validate that at least one receipt file is uploaded
    if (uploadedFiles.length === 0) {
      toast.error('Receipt attachment is mandatory')
      return
    }
    
    try {
      const isEditing = !!editingReceipt
      const url = isEditing ? `/api/transactions/${editingReceipt._id}` : '/api/transactions'
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'receipt',
          amount: amountValue,
          posMachine: formData.posMachine,
          agentId: isAdmin ? (formData.agentId || null) : undefined,
          description: formData.description,
          attachments: uploadedFiles,
          date: formData.date,
          metadata: {
            receiptNumber: formData.receiptNumber
          }
        })
      })
      
      if (response.ok) {
        toast.success(editingReceipt ? 'Receipt updated successfully' : 'Receipt added successfully')
        setShowModal(false)
        resetForm()
        fetchReceipts()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save receipt')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save receipt')
    }
  }

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt)
    setFormData({
      receiptNumber: receipt.receiptNumber,
      date: format(new Date(receipt.date), 'yyyy-MM-dd'),
      posMachine: receipt.posMachine?._id || '',
      agentId: '',
      amount: receipt.amount.toString(),
      description: receipt.description
    })
    setUploadedFiles(receipt.attachments || [])
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deletingReceipt) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/transactions/${deletingReceipt._id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Receipt deleted successfully')
        setShowDeleteDialog(false)
        setDeletingReceipt(null)
        fetchReceipts()
      } else {
        throw new Error('Failed to delete receipt')
      }
    } catch (error) {
      toast.error('Failed to delete receipt')
    } finally {
      setDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({ receiptNumber: '', date: format(new Date(), 'yyyy-MM-dd'), posMachine: '', agentId: '', amount: '', description: '' })
    setUploadedFiles([])
    setEditingReceipt(null)
  }

  const generateReceiptNumber = () => {
    // Remove auto-generation, let user input manually
    setFormData({...formData, receiptNumber: ''})
  }

  const exportReceipts = () => {
    const { exportToExcel, reportColumns } = require('@/lib/excelExport')
    exportToExcel({
      filename: 'receipts_report',
      sheetName: 'Receipts',
      columns: isAdmin ? reportColumns.receiptsAdmin(t) : reportColumns.receiptsAgent(t),
      data: [
        ...filteredReceipts.map(r => {
          const marginAmt = r.posMachine?.commissionPercentage != null ? (r.amount * r.posMachine.commissionPercentage / 100) : null
          const bankChargesAmt = r.posMachine?.bankCharges != null ? (r.amount * r.posMachine.bankCharges / 100) : null
          const vatAmt = (bankChargesAmt != null && r.posMachine?.vatPercentage != null)
            ? (bankChargesAmt * r.posMachine.vatPercentage / 100)
            : null

          return {
            ...r,
            agent: r.agent || '—',
            date: format(new Date(r.date), 'dd-MMM-yyyy'),
            posMachineInfo: r.posMachine ? `${r.posMachine.segment} / ${r.posMachine.brand}` : 'No POS',
            chargesPercent: r.posMachine?.commissionPercentage != null ? Number(r.posMachine.commissionPercentage).toFixed(2) : '',
            charges: marginAmt != null ? Number(marginAmt.toFixed(2)) : '',
            bankChargesPercent: r.posMachine?.bankCharges != null ? Number(r.posMachine.bankCharges).toFixed(2) : '',
            bankCharges: bankChargesAmt != null ? Number(bankChargesAmt.toFixed(2)) : '',
            vatPercent: r.posMachine?.vatPercentage != null ? Number(r.posMachine.vatPercentage).toFixed(2) : '',
            vat: vatAmt != null ? Number(vatAmt.toFixed(2)) : '',
            amount: Number(r.amount.toFixed(2)),
            createdByDate: `${r.createdBy || '—'} | ${r.createdAt ? format(new Date(r.createdAt), 'dd-MMM-yyyy HH:mm') : '—'}`,
            updatedByDate: `${r.updatedBy || '—'} | ${r.updatedAt ? format(new Date(r.updatedAt), 'dd-MMM-yyyy HH:mm') : '—'}`
          }
          })
      ],
      title: t('receiptsReport'),
      grandTotals: {
        enabled: true,
        row: {
          label: `Grand Total (${filteredReceipts.length} records)`,
          values: {
            amount: grandTotal,
            charges: grandTotalCharges,
            bankCharges: grandTotalBankCharges,
            vat: grandTotalVat,
          }
        }
      },
      isRTL: false
    })
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{t('receipts')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('manageReceipts')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportReceipts}
            className="btn-secondary inline-flex items-center justify-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="dubai-button inline-flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addReceipt')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search receipts..."
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

      {/* Receipts */}
      <div className="mt-6">
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : filteredReceipts.length === 0 ? (
          <div className="dubai-card text-center py-12">
            <Receipt className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
              {searchTerm ? 'No receipts found' : 'No receipts yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first receipt'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {paginatedReceipts.map((receipt) => (
                <div key={receipt._id} className="dubai-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{receipt.receiptNumber}</span>
                    <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      {receipt.posMachine ? `${receipt.posMachine.segment}/${receipt.posMachine.brand}` : 'No POS'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{receipt.description}</p>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs text-gray-400">{format(new Date(receipt.date), 'dd-MMM-yyyy')}</span>
                    </div>
                    <span className="text-base font-semibold text-gray-900 dark:text-white">{formatAmount(receipt.amount)}</span>
                  </div>
                  {/* Preview section for mobile */}
                  {receipt.attachments && receipt.attachments.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Attachment:</p>
                      <div className="flex gap-2">
                        {receipt.attachments.map((url, index) => {
                          const fileName = getAttachmentFileName(url, `File ${index + 1}`)
                          const isImage = isImageAttachment(fileName)
                          const viewUrl = getAttachmentViewUrl(url)
                          return (
                            <div key={index} className="relative w-12 h-12">
                              {isImage ? (
                                <>
                                  <img 
                                    src={viewUrl} 
                                    alt={`Receipt ${receipt.receiptNumber}`}
                                    className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer" 
                                    onClick={() => handleImagePreview(url, fileName)}
                                    onError={(e) => {
                                      const t = e.target as HTMLImageElement
                                      t.style.display = 'none'
                                      const fallback = t.parentElement?.querySelector('.img-fallback')
                                      fallback?.classList.remove('hidden')
                                      fallback?.classList.add('flex')
                                    }}
                                  />
                                  <button onClick={() => handleImagePreview(url, fileName)} className="img-fallback hidden w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded items-center justify-center">
                                    <File className="h-6 w-6 text-gray-400" />
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => window.open(viewUrl, '_blank')} className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                                  <File className="h-6 w-6 text-red-500" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                    {receipt.attachments && receipt.attachments.length > 0 && (
                      <button
                        onClick={() => {
                          const firstAttachment = receipt.attachments![0]
                          const fileName = firstAttachment.split('/').pop() || 'Attachment'
                          handleImagePreview(firstAttachment, fileName)
                        }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(receipt)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setDeletingReceipt(receipt)
                          setShowDeleteDialog(true)
                        }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="dubai-card p-4 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Grand Total ({filteredReceipts.length} records)</span>
                  <span className="text-base font-bold text-primary">{formatAmount(grandTotal)}</span>
                </div>
                {isAdmin && (
                  <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                    <span className="text-gray-500">Charges:</span><span className="font-semibold text-emerald-600 text-right">{formatAmount(grandTotalCharges)}</span>
                    <span className="text-gray-500">Bank Charges:</span><span className="font-semibold text-rose-600 text-right">{formatAmount(grandTotalBankCharges)}</span>
                    <span className="text-gray-500">VAT:</span><span className="font-semibold text-rose-600 text-right">{formatAmount(grandTotalVat)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto dubai-card !p-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    {['Batch ID', ...(isAdmin ? ['Agent'] : []), 'POS Machine', t('date'), 'Receipt Amount',
                      ...(isAdmin ? ['Charges %', 'Charges', 'Bank Charges %', 'Bank Charges', 'VAT %', 'VAT', 'Created By / Date', 'Updated By / Date'] : []),
                      t('description'), 'Preview', t('actions')
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedReceipts.map((receipt) => (
                    <tr key={receipt._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {receipt.receiptNumber}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {receipt.agent || '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          {receipt.posMachine ? `${receipt.posMachine.segment}/${receipt.posMachine.brand}` : 'No POS'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(receipt.date), 'dd-MMM-yyyy')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary">
                        {formatAmount(receipt.amount)}
                      </td>
                      {isAdmin && (
                        <>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {receipt.posMachine?.commissionPercentage != null
                              ? `${Number(receipt.posMachine.commissionPercentage).toFixed(2)}%`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {receipt.posMachine?.commissionPercentage != null
                              ? formatAmount(receipt.amount * receipt.posMachine.commissionPercentage / 100)
                              : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {receipt.posMachine?.bankCharges != null
                              ? `${Number(receipt.posMachine.bankCharges).toFixed(2)}%`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {receipt.posMachine?.bankCharges != null
                              ? formatAmount(receipt.amount * receipt.posMachine.bankCharges / 100)
                              : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {receipt.posMachine?.vatPercentage != null
                              ? `${Number(receipt.posMachine.vatPercentage).toFixed(2)}%`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {receipt.posMachine?.vatPercentage != null
                              ? (() => {
                                  const bankChargesAmount = receipt.posMachine?.bankCharges != null
                                    ? (receipt.amount * receipt.posMachine.bankCharges / 100)
                                    : 0
                                  const vatAmount = bankChargesAmount * receipt.posMachine.vatPercentage / 100
                                  return formatAmount(vatAmount)
                                })()
                              : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            <div className="meta-compact">
                              <div className="meta-compact-name">{receipt.createdBy || '—'}</div>
                              <div className="meta-compact-date">{receipt.createdAt ? format(new Date(receipt.createdAt), 'dd-MMM-yyyy HH:mm') : '—'}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            <div className="meta-compact">
                              <div className="meta-compact-name">{receipt.updatedBy || '—'}</div>
                              <div className="meta-compact-date">{receipt.updatedAt ? format(new Date(receipt.updatedAt), 'dd-MMM-yyyy HH:mm') : '—'}</div>
                            </div>
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 max-w-[180px] truncate">
                        {receipt.description}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                        {receipt.attachments && receipt.attachments.length > 0 ? (
                          <div className="flex justify-center gap-1">
                            {receipt.attachments.map((url, index) => {
                              const fileName = getAttachmentFileName(url, `File ${index + 1}`)
                              const isImage = isImageAttachment(fileName)
                              const viewUrl = getAttachmentViewUrl(url)
                              return (
                                <div key={index} className="relative group">
                                  {isImage ? (
                                    <div className="relative w-8 h-8">
                                      <img 
                                        src={viewUrl} 
                                        alt={`Receipt ${receipt.receiptNumber}`}
                                        className="w-8 h-8 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:scale-110 transition-transform" 
                                        onClick={() => handleImagePreview(url, fileName)}
                                        title="Click to preview image"
                                        onError={(e) => {
                                          const t = e.target as HTMLImageElement
                                          t.style.display = 'none'
                                          const fallback = t.parentElement?.querySelector('.img-fallback')
                                          fallback?.classList.remove('hidden')
                                          fallback?.classList.add('flex')
                                        }}
                                      />
                                      <button
                                        onClick={() => handleImagePreview(url, fileName)}
                                        className="img-fallback hidden w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded items-center justify-center"
                                        title="Preview unavailable"
                                      >
                                        <File className="h-4 w-4 text-gray-400" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => window.open(viewUrl, '_blank')}
                                      className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                      title="Click to view PDF"
                                    >
                                      <File className="h-4 w-4 text-red-500" />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No attachment</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                        <div className="flex justify-center gap-1">
                          {receipt.attachments && receipt.attachments.length > 0 && (
                            <button
                              onClick={() => {
                                const firstAttachment = receipt.attachments![0]
                                const fileName = getAttachmentFileName(firstAttachment, 'Attachment')
                                handleImagePreview(firstAttachment, fileName)
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="View attachment"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(receipt)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title={t('edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setDeletingReceipt(receipt)
                                setShowDeleteDialog(true)
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title={t('delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600">
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Grand Total ({filteredReceipts.length} records)</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-primary">{formatAmount(grandTotal)}</td>
                    {isAdmin && (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-500">—</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-emerald-600">{formatAmount(grandTotalCharges)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-500">—</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-rose-600">{formatAmount(grandTotalBankCharges)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-500">—</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-rose-600">{formatAmount(grandTotalVat)}</td>
                        <td colSpan={5} />
                      </>
                    )}
                    {!isAdmin && <td colSpan={3} />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {!loading && filteredReceipts.length > 0 && (
        <TablePagination
          totalItems={filteredReceipts.length}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {/* Add/Edit Receipt Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {editingReceipt ? 'Edit Receipt' : t('addReceipt')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {editingReceipt ? 'Update receipt details' : 'Fill in the receipt details below'}
                </p>
              </div>
              <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="modal-close-btn">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Section: Assignment */}
              <div className="form-section">
                <p className="form-section-title">Assignment</p>
                {isAdmin && (
                  <div>
                    <label className="form-label">Agent *</label>
                    <SearchableSelect
                      value={formData.agentId}
                      onChange={(value) => setFormData({ ...formData, agentId: value, posMachine: '' })}
                      options={[
                        { value: '', label: 'Select Agent' },
                        ...agents.map((agent) => ({ value: agent._id, label: agent.name })),
                      ]}
                      placeholder="Select Agent"
                    />
                  </div>
                )}
                <div>
                  <label className="form-label">POS Machine *</label>
                  <SearchableSelect
                    value={formData.posMachine}
                    onChange={(value) => setFormData({ ...formData, posMachine: value })}
                    options={[
                      { value: '', label: 'Select POS Machine' },
                      ...availablePosMachines.map((m) => ({
                        value: m._id,
                        label: `${m.segment} / ${m.brand} — ${m.terminalId}${m.status !== 'active' ? ` (${m.status})` : ''}`,
                      })),
                    ]}
                    placeholder="Select POS Machine"
                  />
                  {isAdmin && !editingReceipt && !formData.agentId
                    ? <p className="text-xs text-amber-500 mt-1">Select an agent first to view assigned POS machines</p>
                    : availablePosMachines.length === 0
                      ? <p className="text-xs text-red-500 mt-1">No POS machines available for the selected agent</p>
                      : null}
                </div>
              </div>

              {/* Section: Transaction */}
              <div className="form-section">
                <p className="form-section-title">Transaction Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Batch ID *</label>
                    <input type="text" required className="form-input uppercase" placeholder="Enter batch ID"
                      value={formData.receiptNumber}
                      onChange={(e) => setFormData({...formData, receiptNumber: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <DatePicker label={t('date')} required value={formData.date} onChange={(v) => setFormData({...formData, date: v})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">{t('amount')} (AED)</label>
                    <input type="number" placeholder="0.00" required min="0.01" step="0.01" className="form-input"
                      value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="form-label">{t('description')}</label>
                    <input type="text" placeholder={t('description')} className="form-input"
                      value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              {/* Section: Attachment */}
              <div className="form-section">
                <p className="form-section-title">Attachment</p>
                <div
                  className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-5 text-center hover:border-primary/60 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-700/30"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5') }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5') }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files) }}
                >
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { if (e.target.files) handleFileUpload(e.target.files) }} />
                  <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{uploading ? 'Uploading...' : 'Click, drag & drop, or paste to upload'}</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF or PDF — max 5MB • Ctrl+V to paste</p>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    {uploadedFiles.map((url, index) => {
                      const fileName = getAttachmentFileName(url, `File ${index + 1}`)
                      const isImage = isImageAttachment(fileName)
                      const viewUrl = getAttachmentViewUrl(url)
                      return (
                        <div key={url} className="flex items-center gap-3 flex-1 min-w-0">
                          {isImage
                            ? <img src={viewUrl} alt={fileName} className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-600 flex-shrink-0" />
                            : <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0"><File className="h-5 w-5 text-red-500" /></div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{fileName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View</a>
                              <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                              <button type="button" onClick={() => removeUploadedFile(url)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="btn-secondary w-full sm:w-auto">{t('cancel')}</button>
                <button type="submit"
                  disabled={
                    !formData.receiptNumber.trim()
                    || !formData.amount
                    || !formData.date
                    || !formData.posMachine
                    || (isAdmin && !editingReceipt && !formData.agentId)
                    || uploadedFiles.length === 0
                    || (parseFloat(formData.amount) || 0) <= 0
                  }
                  className="dubai-button w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingReceipt ? 'Update Receipt' : t('addReceipt')}
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
              Are you sure you want to delete receipt {deletingReceipt?.receiptNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setShowDeleteDialog(false)
                setDeletingReceipt(null)
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
      
      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        imageUrl={previewImage.url}
        fileName={previewImage.fileName}
      />
    </div>
  )
}