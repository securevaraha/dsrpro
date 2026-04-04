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
      const response = await fetch('/api/transactions?type=receipt&limit=500')
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
      const response = await fetch('/api/users?role=agent')
      if (response.ok) {
        const data = await response.json()
        setAgents(data.users || [])
      }
    } catch {}
  }

  const fetchPosMachines = async () => {
    try {
      const response = await fetch('/api/pos-machines')
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
  
  const handleImagePreview = (url: string, fileName: string) => {
    const isImage = url.match(/\.(jpg|jpeg|png|gif)$/i)
    if (isImage) {
      setPreviewImage({ url, fileName })
      setShowImagePreview(true)
    } else {
      // For PDFs, still open in new tab
      window.open(url, '_blank')
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
    const rDate = new Date(receipt.date)
    const matchesFrom = !filters.dateFrom || rDate >= new Date(filters.dateFrom)
    const matchesTo = !filters.dateTo || rDate <= new Date(filters.dateTo + 'T23:59:59')
    return matchesSearch && matchesBatchId && matchesPOS && matchesAgent && matchesFrom && matchesTo
  })

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
    { key: 'dateFrom', label: 'Date From', type: 'date' as const },
    { key: 'dateTo', label: 'Date To', type: 'date' as const },
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
          // VAT on full receipt amount
          const vatAmt = r.posMachine?.vatPercentage != null ? (r.amount * r.posMachine.vatPercentage / 100) : null

          return {
            ...r,
            agent: r.agent || '—',
            date: format(new Date(r.date), 'dd-MMM-yyyy'),
            posMachineInfo: r.posMachine ? `${r.posMachine.segment} / ${r.posMachine.brand}` : 'No POS',
            margin: marginAmt != null ? `AED ${marginAmt.toFixed(2)} (${r.posMachine!.commissionPercentage}%)` : '',
            bankCharges: bankChargesAmt != null ? `AED ${bankChargesAmt.toFixed(2)} (${r.posMachine!.bankCharges}%)` : '',
            vat: vatAmt != null ? `AED ${vatAmt.toFixed(2)} (${r.posMachine!.vatPercentage}%)` : '',
            amount: `AED ${r.amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            createdByDate: `${r.createdBy || '—'} | ${r.createdAt ? format(new Date(r.createdAt), 'dd-MMM-yyyy HH:mm') : '—'}`,
            updatedByDate: `${r.updatedBy || '—'} | ${r.updatedAt ? format(new Date(r.updatedAt), 'dd-MMM-yyyy HH:mm') : '—'}`
          }
        }),
        {
          receiptNumber: `Grand Total (${filteredReceipts.length} records)`,
          amount: `AED ${grandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        }
      ],
      title: t('receiptsReport'),
      grandTotals: {
        enabled: true,
        summary: `Grand Total: AED ${grandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
      <div className="mt-5 flex gap-2">
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
              {filteredReceipts.map((receipt) => (
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
                    <span className="text-base font-semibold text-gray-900 dark:text-white">AED {receipt.amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {/* Preview section for mobile */}
                  {receipt.attachments && receipt.attachments.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Attachment:</p>
                      <div className="flex gap-2">
                        {receipt.attachments.map((url, index) => {
                          const isImage = url.match(/\.(jpg|jpeg|png|gif)$/i)
                          const fileName = url.split('/').pop() || `File ${index + 1}`
                          return (
                            <div key={index} className="relative w-12 h-12">
                              {isImage ? (
                                <>
                                  <img 
                                    src={url} 
                                    alt={`Receipt ${receipt.receiptNumber}`}
                                    className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer" 
                                    onClick={() => handleImagePreview(url, fileName)}
                                    onError={(e) => { const t = e.target as HTMLImageElement; t.style.display='none'; t.parentElement?.querySelector('.img-fallback')?.classList.remove('hidden') }}
                                  />
                                  <button onClick={() => handleImagePreview(url, fileName)} className="img-fallback hidden w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                                    <File className="h-6 w-6 text-gray-400" />
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => window.open(url, '_blank')} className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
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
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Grand Total ({filteredReceipts.length} records)</span>
                  <span className="text-base font-bold text-primary">AED {grandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto dubai-card !p-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    {['Batch ID', ...(isAdmin ? ['Agent'] : []), 'POS Machine', t('date'), 'Receipt Amount',
                      ...(isAdmin ? ['Bank Charges', 'VAT', 'Margin', 'Created By / Date', 'Updated By / Date'] : []),
                      t('description'), 'Preview', t('actions')
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredReceipts.map((receipt) => (
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
                        AED {receipt.amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {isAdmin && (
                        <>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {receipt.posMachine?.bankCharges != null
                              ? `AED ${(receipt.amount * receipt.posMachine.bankCharges / 100).toFixed(2)} (${receipt.posMachine.bankCharges}%)`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {receipt.posMachine?.vatPercentage != null
                              ? `AED ${(receipt.amount * receipt.posMachine.vatPercentage / 100).toFixed(2)} (${receipt.posMachine.vatPercentage}%)`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {receipt.posMachine?.commissionPercentage != null
                              ? `AED ${(receipt.amount * receipt.posMachine.commissionPercentage / 100).toFixed(2)} (${receipt.posMachine.commissionPercentage}%)`
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
                              const isImage = url.match(/\.(jpg|jpeg|png|gif)$/i)
                              const fileName = url.split('/').pop() || `File ${index + 1}`
                              return (
                                <div key={index} className="relative group">
                                  {isImage ? (
                                    <div className="relative w-8 h-8">
                                      <img 
                                        src={url} 
                                        alt={`Receipt ${receipt.receiptNumber}`}
                                        className="w-8 h-8 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:scale-110 transition-transform" 
                                        onClick={() => handleImagePreview(url, fileName)}
                                        title="Click to preview image"
                                        onError={(e) => { const t = e.target as HTMLImageElement; t.style.display='none'; t.parentElement?.querySelector('.img-fallback')?.classList.remove('hidden') }}
                                      />
                                      <button
                                        onClick={() => handleImagePreview(url, fileName)}
                                        className="img-fallback hidden w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center"
                                        title="Preview unavailable"
                                      >
                                        <File className="h-4 w-4 text-gray-400" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => window.open(url, '_blank')}
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
                                const fileName = firstAttachment.split('/').pop() || 'Attachment'
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-primary">AED {grandTotal.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td colSpan={isAdmin ? 8 : 3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

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
                    <select required className="form-select" value={formData.agentId} onChange={(e) => setFormData({...formData, agentId: e.target.value, posMachine: ''})}>
                      <option value="">Select Agent</option>
                      {agents.map(agent => <option key={agent._id} value={agent._id}>{agent.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="form-label">POS Machine *</label>
                  <select required className="form-select" value={formData.posMachine} onChange={(e) => setFormData({...formData, posMachine: e.target.value})}>
                    <option value="">Select POS Machine</option>
                    {availablePosMachines.map(m => (
                        <option key={m._id} value={m._id}>
                          {m.segment} / {m.brand} — {m.terminalId}{m.status !== 'active' ? ` (${m.status})` : ''}
                        </option>
                      ))}
                  </select>
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
                      const fileName = url.split('/').pop() || `File ${index + 1}`
                      const isImage = url.match(/\.(jpg|jpeg|png|gif)$/i)
                      return (
                        <div key={url} className="flex items-center gap-3 flex-1 min-w-0">
                          {isImage
                            ? <img src={url} alt={fileName} className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-600 flex-shrink-0" />
                            : <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0"><File className="h-5 w-5 text-red-500" /></div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{fileName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View</a>
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