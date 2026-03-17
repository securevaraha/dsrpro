'use client'
import { useState, useEffect, useRef } from 'react'
import { Plus, Download, Eye, Edit, Trash2, Receipt, Search, Filter, Upload, File, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { ImagePreviewModal } from '@/components/ImagePreviewModal'

interface Receipt {
  _id: string
  receiptNumber: string
  date: string
  posMachine: {
    _id: string
    segment: string
    brand: string
    terminalId: string
  } | null
  amount: number
  description: string
  attachments?: string[]
}

export default function Receipts() {
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [posMachines, setPosMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [deletingReceipt, setDeletingReceipt] = useState<Receipt | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImage, setPreviewImage] = useState({ url: '', fileName: '' })
  const [formData, setFormData] = useState({
    receiptNumber: '',
    date: format(new Date(), 'dd-MMM-yyyy'),
    posMachine: '',
    amount: '',
    description: '',
  })

  useEffect(() => {
    fetchReceipts()
    fetchPosMachines()
  }, [])

  const fetchReceipts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transactions?type=receipt')
      if (response.ok) {
        const data = await response.json()
        const formattedReceipts = data.transactions.map((t: any) => ({
          _id: t._id,
          receiptNumber: t.transactionId,
          date: t.createdAt,
          posMachine: t.posMachine || null,
          amount: t.amount,
          description: t.description || 'Transaction',
          attachments: t.attachments || []
        }))
        setReceipts(formattedReceipts)
      }
    } catch (error) {
      console.error('Failed to fetch receipts:', error)
      toast.error('Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }

  const fetchPosMachines = async () => {
    try {
      const response = await fetch('/api/pos-machines')
      if (response.ok) {
        const data = await response.json()
        setPosMachines(data.machines || [])
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
    const matchesStatus = statusFilter === 'all' || 
                         (receipt.posMachine && `${receipt.posMachine.segment}/${receipt.posMachine.brand}` === statusFilter)
    return matchesSearch && matchesStatus
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate that at least one file is uploaded
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one attachment before submitting the receipt')
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
          amount: parseFloat(formData.amount),
          posMachine: formData.posMachine || null,
          description: formData.description,
          attachments: uploadedFiles,
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
      date: format(new Date(receipt.date), 'dd-MMM-yyyy'),
      posMachine: receipt.posMachine?._id || '',
      amount: receipt.amount.toString(),
      description: receipt.description
    })
    setUploadedFiles(receipt.attachments || [])
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deletingReceipt) return
    
    try {
      const response = await fetch(`/api/transactions/${deletingReceipt._id}`, {
        method: 'DELETE'
      })
      
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
    }
  }

  const resetForm = () => {
    setFormData({ receiptNumber: '', date: format(new Date(), 'dd-MMM-yyyy'), posMachine: '', amount: '', description: '' })
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
      columns: reportColumns.payments(t),
      data: filteredReceipts.map(r => ({
        ...r,
        date: format(new Date(r.date), 'dd-MMM-yyyy'),
        amount: `AED ${r.amount.toLocaleString()}`
      })),
      title: t('receiptsReport'),
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
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search receipts..."
            className="form-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All POS Machines</option>
          {posMachines.map(machine => (
            <option key={machine._id} value={`${machine.segment}/${machine.brand}`}>
              {machine.segment} / {machine.brand}
            </option>
          ))}
        </select>
      </div>

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
            {!searchTerm && (
              <button
                onClick={() => {
                  resetForm()
                  setShowModal(true)
                }}
                className="dubai-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('addReceipt')}
              </button>
            )}
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
                            <div key={index} className="relative">
                              {isImage ? (
                                <img 
                                  src={url} 
                                  alt={`Receipt ${receipt.receiptNumber}`}
                                  className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer" 
                                  onClick={() => handleImagePreview(url, fileName)}
                                />
                              ) : (
                                <button
                                  onClick={() => window.open(url, '_blank')}
                                  className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center"
                                >
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
                    <button
                      onClick={() => {
                        setDeletingReceipt(receipt)
                        setShowDeleteDialog(true)
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-hidden dubai-card !p-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction Number</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('date')}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">POS Machine</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('amount')}</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('description')}</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Preview</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filteredReceipts.map((receipt) => (
                    <tr key={receipt._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {receipt.receiptNumber}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(receipt.date), 'dd-MMM-yyyy')}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm">
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          {receipt.posMachine ? `${receipt.posMachine.segment}/${receipt.posMachine.brand}` : 'No POS'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-right text-gray-900 dark:text-gray-100">
                        AED {receipt.amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                        {receipt.description}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center text-sm">
                        {receipt.attachments && receipt.attachments.length > 0 ? (
                          <div className="flex justify-center gap-1">
                            {receipt.attachments.map((url, index) => {
                              const isImage = url.match(/\.(jpg|jpeg|png|gif)$/i)
                              const fileName = url.split('/').pop() || `File ${index + 1}`
                              return (
                                <div key={index} className="relative group">
                                  {isImage ? (
                                    <img 
                                      src={url} 
                                      alt={`Receipt ${receipt.receiptNumber}`}
                                      className="w-8 h-8 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:scale-110 transition-transform" 
                                      onClick={() => handleImagePreview(url, fileName)}
                                      title="Click to preview image"
                                    />
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
                      <td className="px-5 py-3.5 whitespace-nowrap text-center text-sm">
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Receipt Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {editingReceipt ? 'Edit Receipt' : t('addReceipt')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {editingReceipt ? 'Update receipt details below' : 'Fill in the receipt details below'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="form-label text-sm">Transaction Number *</label>
                  <input
                    type="text"
                    required
                    className="form-input h-10 uppercase"
                    placeholder="Enter transaction number"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData({...formData, receiptNumber: e.target.value.toUpperCase()})}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="form-label text-sm">{t('date')}</label>
                  <input
                    type="text"
                    required
                    className="form-input h-10"
                    value={formData.date}
                    placeholder="dd-MMM-yyyy"
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="form-label text-sm">POS Machine</label>
                  <select
                    className="form-select h-10 min-w-0"
                    value={formData.posMachine}
                    onChange={(e) => setFormData({...formData, posMachine: e.target.value})}
                  >
                    <option value="">Select POS Machine</option>
                    {posMachines.map(machine => (
                      <option key={machine._id} value={machine._id}>
                        {machine.segment} / {machine.brand} - {machine.terminalId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-sm">{t('amount')}</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    required
                    className="form-input h-10"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="form-label text-sm">{t('description')}</label>
                  <input
                    type="text"
                    placeholder={t('description')}
                    required
                    className="form-input h-10"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>
              
              {/* File Upload Section */}
              <div>
                <label className="form-label text-sm">Attachments</label>
                <div className="space-y-3">
                  {/* Upload Area */}
                  <div 
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.add('border-primary', 'bg-primary/5')
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('border-primary', 'bg-primary/5')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('border-primary', 'bg-primary/5')
                      const files = e.dataTransfer.files
                      if (files) handleFileUpload(files)
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleFileUpload(e.target.files)
                      }}
                    />
                    <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {uploading ? 'Uploading file...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      One image (JPG, PNG, GIF) or PDF file, max 5MB
                    </p>
                  </div>
                  
                  {/* Uploaded File */}
                  {uploadedFiles.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      {uploadedFiles.map((url, index) => {
                        const fileName = url.split('/').pop() || `File ${index + 1}`
                        const isImage = url.match(/\.(jpg|jpeg|png|gif)$/i)
                        return (
                          <div key={url} className="flex items-center gap-3">
                            {isImage ? (
                              <div className="flex-shrink-0">
                                <img 
                                  src={url} 
                                  alt={fileName} 
                                  className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-600" 
                                />
                              </div>
                            ) : (
                              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                                <File className="h-6 w-6 text-red-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {fileName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  View File
                                </a>
                                <span className="text-xs text-gray-400">•</span>
                                <button
                                  type="button"
                                  onClick={() => removeUploadedFile(url)}
                                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="btn-secondary w-full sm:w-auto"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="dubai-button w-full sm:w-auto"
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
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
            >
              Delete
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