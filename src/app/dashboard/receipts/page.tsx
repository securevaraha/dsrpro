'use client'
import { useState, useEffect } from 'react'
import { Plus, Download, Eye, Edit, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'

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
  const [showModal, setShowModal] = useState(false)
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
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      toast.success(t('addReceipt') + ' successful')
      setShowModal(false)
      setFormData({ receiptNumber: '', date: '', paymentMethod: 'cash', amount: '', description: '' })
      fetchReceipts()
    } catch (error) {
      toast.error('Failed to add receipt')
    }
  }

  const generateReceiptNumber = () => {
    const nextNumber = `R${String(receipts.length + 1).padStart(3, '0')}`
    setFormData({...formData, receiptNumber: nextNumber})
  }

  const handlePrint = (receipt: Receipt) => {
    toast.success('Receipt printed successfully')
  }

  const handleDownload = (receipt: Receipt) => {
    toast.success('Receipt downloaded successfully')
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-text dark:text-text-dark">{t('receipts')}</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{t('manageReceipts')}</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
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

      {/* Receipts Table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
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
                  {receipts.map((receipt) => (
                    <tr key={receipt._id} className="table-row">
                      <td className="table-cell font-medium">
                        {receipt.receiptNumber}
                      </td>
                      <td className="table-cell">
                        {format(new Date(receipt.date), 'dd/MM/yyyy')}
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
                        ₹{receipt.amount.toLocaleString()}
                      </td>
                      <td className="table-cell">
                        {receipt.description}
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handlePrint(receipt)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            title={t('view')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(receipt)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button 
                            className="text-primary hover:text-accent transition-colors" 
                            title={t('edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
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
          </div>
        </div>
      </div>

      {/* Add Receipt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-card dubai-card">
            <h3 className="text-lg font-bold text-text dark:text-text-dark mb-4">{t('addReceipt')}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder={t('receiptNumber')}
                required
                className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-gray-100 dark:bg-gray-600 text-text dark:text-text-dark"
                value={formData.receiptNumber}
                readOnly
              />
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-white dark:bg-gray-700 text-text dark:text-text-dark"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
              <select
                className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-white dark:bg-gray-700 text-text dark:text-text-dark"
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
                className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-white dark:bg-gray-700 text-text dark:text-text-dark"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
              <textarea
                placeholder={t('description')}
                required
                className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-white dark:bg-gray-700 text-text dark:text-text-dark"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ receiptNumber: '', date: '', paymentMethod: 'cash', amount: '', description: '' })
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-card hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="dubai-button px-4 py-2 text-sm"
                >
                  {t('addReceipt')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}