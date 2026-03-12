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
  const [settlementStats, setSettlementStats] = useState<any>({ totalSales: 0, totalMargin: 0, totalPaid: 0, totalBalance: 0 })
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
        setSettlementStats(data.stats || { totalSales: 0, totalMargin: 0, totalPaid: 0, totalBalance: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch settlements:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMerchants = async () => {
    try {
      const response = await fetch('/api/users?role=agent')
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
    <RoleGuard allowedRoles={['admin']}>
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Merchant Settlements</h1>
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
      <div className="mt-6 sm:mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <div className="dubai-card p-4 sm:p-6">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-success flex-shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total CC Sales</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">AED {settlementStats.totalSales?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
        
        <div className="dubai-card p-4 sm:p-6">
          <div className="flex items-center">
            <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Margin</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">AED {settlementStats.totalMargin?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
        
        <div className="dubai-card p-4 sm:p-6">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-warning flex-shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Paid</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">AED {settlementStats.totalPaid?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
        
        <div className="dubai-card p-4 sm:p-6">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-danger flex-shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Balance Due</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">AED {settlementStats.totalBalance?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Excel-like Table Headers */}
      <div className="mt-8 dubai-card p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Settlement Ledger (Excel Format)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">DATES</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">MERCHANT</th>
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
              {settlements.length > 0 ? settlements.map((s: any) => (
                <tr key={s._id}>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{format(new Date(s.date), 'dd-MMM-yyyy')}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{s.merchantId?.name || s.merchantId?.companyName || '—'}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{s.ccSales?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{s.charges?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{s.bankCharges?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{s.vat?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{s.netReceived?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{s.toPay?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{s.margin?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{s.paid?.toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{s.balance?.toLocaleString()}</td>
                </tr>
              )) : (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                  No settlement data yet. Add your first settlement to see Excel-like calculations.
                </td>
              </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Settlement Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">Add Daily Settlement</h3>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-8">
              Record a new daily card settlement entry
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="form-label">Merchant</label>
                  <select
                    required
                    className="form-select"
                    value={formData.merchantId}
                    onChange={(e) => setFormData({...formData, merchantId: e.target.value})}
                  >
                    <option value="">Select Merchant</option>
                    {merchants.map(merchant => (
                      <option key={merchant._id} value={merchant._id}>
                        {merchant.name} - {merchant.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Credit Card Sales (C/C SALES)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    required
                    className="form-input"
                    value={formData.ccSales}
                    onChange={(e) => setFormData({...formData, ccSales: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="form-label">Bank Charges <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="form-input"
                    value={formData.bankCharges}
                    onChange={(e) => setFormData({...formData, bankCharges: e.target.value})}
                  />
                </div>
                <div>
                  <label className="form-label">Amount Paid to Merchant</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="form-input"
                    value={formData.paid}
                    onChange={(e) => setFormData({...formData, paid: e.target.value})}
                  />
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 text-sm">
                <p className="text-gray-600 dark:text-gray-300 font-medium">
                  Auto-calculated fields:
                </p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  3.75% charges, VAT, Net Received, Margin, and Balance will be computed automatically.
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-5 border-t border-gray-200 dark:border-gray-700 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dubai-button w-full sm:w-auto"
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
