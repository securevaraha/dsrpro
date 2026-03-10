'use client'
import { useState, useEffect } from 'react'
import { Plus, Calculator, TrendingUp, DollarSign } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { RoleGuard } from '@/components/RoleGuard'

export default function Settlements() {
  const { t } = useLanguage()
  const [settlements, setSettlements] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState('')
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    merchantId: '',
    ccSales: '',
    bankCharges: '',
    paid: ''
  })

  useEffect(() => {
    fetchSettlements()
    fetchMerchants()
  }, [])

  const fetchSettlements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settlements')
      if (response.ok) {
        const data = await response.json()
        setSettlements(data.settlements || [])
      }
    } catch (error) {
      console.error('Failed to fetch settlements:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMerchants = async () => {
    try {
      const response = await fetch('/api/users?role=vendor')
      if (response.ok) {
        const data = await response.json()
        setMerchants(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch merchants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ccSales: parseFloat(formData.ccSales),
          bankCharges: parseFloat(formData.bankCharges || '0'),
          paid: parseFloat(formData.paid || '0')
        })
      })
      
      if (response.ok) {
        toast.success('Settlement created successfully')
        setShowModal(false)
        setFormData({
          date: format(new Date(), 'yyyy-MM-dd'),
          merchantId: '',
          ccSales: '',
          bankCharges: '',
          paid: ''
        })
        fetchSettlements()
      } else {
        throw new Error('Failed to create settlement')
      }
    } catch (error) {
      toast.error('Failed to create settlement')
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'vendor']}>
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-text dark:text-text-dark">Merchant Settlements</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Track daily card sales and settlements like Excel sheets</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowModal(true)}
            className="dubai-button inline-flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Settlement
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="dubai-card p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-success" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total CC Sales</p>
              <p className="text-2xl font-bold text-text dark:text-text-dark">AED 0</p>
            </div>
          </div>
        </div>
        
        <div className="dubai-card p-6">
          <div className="flex items-center">
            <Calculator className="h-8 w-8 text-primary" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Margin</p>
              <p className="text-2xl font-bold text-text dark:text-text-dark">AED 0</p>
            </div>
          </div>
        </div>
        
        <div className="dubai-card p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-warning" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Paid</p>
              <p className="text-2xl font-bold text-text dark:text-text-dark">AED 0</p>
            </div>
          </div>
        </div>
        
        <div className="dubai-card p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-danger" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance Due</p>
              <p className="text-2xl font-bold text-text dark:text-text-dark">AED 0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Excel-like Table Headers */}
      <div className="mt-8 dubai-card p-6">
        <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">Settlement Ledger (Excel Format)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">DATES</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">C/C SALES</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">3.75% CHARGES</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">BANK CHARGES</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">VAT</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">NET RECEIVED</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">TO PAY</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">MARGIN</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PAID</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">BALANCE</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                  No settlement data yet. Add your first settlement to see Excel-like calculations.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Settlement Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-lg font-bold text-text dark:text-text-dark mb-4">Add Daily Settlement</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="date"
                required
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
              <select
                required
                className="form-select"
                value={formData.merchantId}
                onChange={(e) => setFormData({...formData, merchantId: e.target.value})}
              >
                <option value="">Select Merchant (Like Excel Sheet)</option>
                {merchants.map(merchant => (
                  <option key={merchant._id} value={merchant._id}>
                    {merchant.name} - {merchant.companyName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Credit Card Sales (C/C SALES)"
                required
                className="form-input"
                value={formData.ccSales}
                onChange={(e) => setFormData({...formData, ccSales: e.target.value})}
              />
              <input
                type="number"
                placeholder="Bank Charges (Optional)"
                className="form-input"
                value={formData.bankCharges}
                onChange={(e) => setFormData({...formData, bankCharges: e.target.value})}
              />
              <input
                type="number"
                placeholder="Amount Paid to Merchant"
                className="form-input"
                value={formData.paid}
                onChange={(e) => setFormData({...formData, paid: e.target.value})}
              />
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  System will auto-calculate: 3.75% charges, VAT, Net Received, Margin, and Balance
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dubai-button"
                >
                  Create Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  )
}