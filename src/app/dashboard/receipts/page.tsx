'use client'
import { useState, useEffect } from 'react'
import { Plus, Download, Eye, Edit, Trash2, Receipt, Search, Filter } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'

interface Receipt {
  _id: string
  receiptNumber: string
  date: string
  paymentMethod: 'cash' | 'bank' | 'upi' | 'card'
  amount: number
  description: string
}

export default function Receipts() {
  const { t } = useLanguage()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [deletingReceipt, setDeletingReceipt] = useState<Receipt | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formData, setFormData] = useState({
    receiptNumber: '',
    date: '',
    paymentMethod: 'cash' as 'cash' | 'bank' | 'upi' | 'card',
    amount: '',
    description: '',
  })

  useEffect(() => {
    fetchReceipts()
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
          paymentMethod: t.paymentMethod,
          amount: t.amount,
          description: t.description || 'Transaction'
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

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || receipt.paymentMethod === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const method = editingReceipt ? 'PUT' : 'POST'
      const url = editingReceipt ? `/api/transactions/${editingReceipt._id}` : '/api/transactions'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'receipt',
          ...formData,
          amount: parseFloat(formData.amount)
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
    } catch (error) {
      toast.error('Failed to save receipt')
    }
  }

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt)
    setFormData({
      receiptNumber: receipt.receiptNumber,
      date: format(new Date(receipt.date), 'yyyy-MM-dd'),
      paymentMethod: receipt.paymentMethod,
      amount: receipt.amount.toString(),
      description: receipt.description
    })
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
    setFormData({ receiptNumber: '', date: '', paymentMethod: 'cash', amount: '', description: '' })
    setEditingReceipt(null)
  }

  const generateReceiptNumber = () => {
    const nextNumber = `R${String(receipts.length + 1).padStart(3, '0')}`
    setFormData({...formData, receiptNumber: nextNumber})
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
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-text dark:text-text-dark">{t('receipts')}</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{t('manageReceipts')}</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
          <button
            onClick={exportReceipts}
            className="btn-secondary inline-flex items-center justify-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => {
              generateReceiptNumber()
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
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <option value="all">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
        </select>
      </div>

      {/* Receipts Table */}
      <div className="mt-8 flex flex-col">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : filteredReceipts.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-2">
                  {searchTerm ? 'No receipts found' : 'No receipts yet'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first receipt'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => {
                      generateReceiptNumber()
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
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-600 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                  <thead className="table-header">
                    <tr>
                      <th className="table-cell font-medium uppercase tracking-wider">{t('receiptNumber')}</th>
                      <th className="table-cell font-medium uppercase tracking-wider">{t('date')}</th>
                      <th className="table-cell font-medium uppercase tracking-wider">{t('paymentMethod')}</th>
                      <th className="table-cell font-medium uppercase tracking-wider">{t('amount')}</th>
                      <th className="table-cell font-medium uppercase tracking-wider">{t('description')}</th>
                      <th className="table-cell font-medium uppercase tracking-wider">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {filteredReceipts.map((receipt) => (
                      <tr key={receipt._id} className="table-row">
                        <td className="table-cell font-medium">
                          {receipt.receiptNumber}
                        </td>
                        <td className="table-cell">
                          {format(new Date(receipt.date), 'dd-MMM-yyyy')}
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            receipt.paymentMethod === 'cash' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            receipt.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            receipt.paymentMethod === 'upi' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {receipt.paymentMethod.toUpperCase()}
                          </span>
                        </td>
                        <td className="table-cell font-medium">
                          AED {receipt.amount.toLocaleString()}
                        </td>
                        <td className="table-cell">
                          {receipt.description}
                        </td>
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(receipt)}
                              className="text-primary hover:text-accent transition-colors"
                              title={t('edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingReceipt(receipt)
                                setShowDeleteDialog(true)
                              }}
                              className="text-danger hover:text-red-700 transition-colors"
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
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Receipt Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-lg font-bold text-text dark:text-text-dark mb-4">
              {editingReceipt ? 'Edit Receipt' : t('addReceipt')}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder={t('receiptNumber')}
                required
                className="form-input bg-gray-100 dark:bg-gray-600"
                value={formData.receiptNumber}
                readOnly
              />
              <input
                type="date"
                required
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
              <select
                className="form-select"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as any})}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
              <input
                type="number"
                placeholder={t('amount')}
                required
                className="form-input"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
              <textarea
                placeholder={t('description')}
                required
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="btn-secondary"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="dubai-button"
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
          <div className="flex justify-end space-x-2 mt-4">
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-card hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}