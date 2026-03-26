'use client'
import { useState, useEffect } from 'react'
import { Plus, Calculator, TrendingUp, DollarSign } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { useLanguage } from '@/components/LanguageProvider'
import { RoleGuard } from '@/components/RoleGuard'
import { DatePicker } from '@/components/ui/date-picker'
import { FilterPanel, FilterButton } from '@/components/ui/filter-panel'

export default function Settlements() {
  const { t } = useLanguage()
  const [settlements, setSettlements] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
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

  const filteredSettlements = settlements.filter(s => {
    const matchesDate = !filters.date || s.date?.startsWith(filters.date)
    const matchesMerchant = !filters.merchant || filters.merchant === 'all' || s.merchantId?._id === filters.merchant
    return matchesDate && matchesMerchant
  })

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length

  const filterFields = [
    { key: 'date', label: 'Date', type: 'text' as const, placeholder: 'YYYY-MM-DD' },
    { key: 'merchant', label: 'Merchant', type: 'select' as const, options: [
      { value: 'all', label: 'All Merchants' },
      ...merchants.map(m => ({ value: m._id, label: `${m.name}${m.companyName ? ` - ${m.companyName}` : ''}` }))
    ]},
  ]

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Merchant Settlements</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track daily card sales and settlements like Excel sheets</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="dubai-button inline-flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Settlement
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

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total CC Sales', value: `AED ${settlementStats.totalSales?.toLocaleString() || '0'}`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Total Margin', value: `AED ${settlementStats.totalMargin?.toLocaleString() || '0'}`, icon: Calculator, color: 'text-primary', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { label: 'Total Paid', value: `AED ${settlementStats.totalPaid?.toLocaleString() || '0'}`, icon: DollarSign, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Balance Due', value: `AED ${settlementStats.totalBalance?.toLocaleString() || '0'}`, icon: DollarSign, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="dubai-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 truncate">{card.label}</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white break-words leading-snug">{card.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile card view */}
      {!loading && filteredSettlements.length > 0 && (
        <div className="md:hidden mt-6 space-y-3">
          {filteredSettlements.map((s: any) => (
            <div key={s._id} className="dubai-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{format(new Date(s.date), 'dd-MMM-yyyy')}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
                  {s.merchantId?.name || s.merchantId?.companyName || '—'}
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                {[['C/C Sales', s.ccSales], ['3.75% Charges', s.charges], ['Bank Charges', s.bankCharges], ['VAT', s.vat], ['Net Received', s.netReceived], ['To Pay', s.toPay], ['Margin', s.margin], ['Paid', s.paid]].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{(val as number)?.toLocaleString() ?? '—'}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1.5 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Balance</span>
                  <span className={`text-xs font-bold ${(s.balance || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{s.balance?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Excel-like Table */}
      <div className="hidden md:block mt-8 dubai-card">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 px-5 pt-5">Settlement Ledger</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                {['Dates', 'Merchant', 'C/C Sales', '3.75% Charges', 'Bank Charges', 'VAT', 'Net Received', 'To Pay', 'Margin', 'Paid', 'Balance'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {settlements.length > 0 ? filteredSettlements.map((s: any) => (
                <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{format(new Date(s.date), 'dd-MMM-yyyy')}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{s.merchantId?.name || s.merchantId?.companyName || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{s.ccSales?.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{s.charges?.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{s.bankCharges?.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{s.vat?.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{s.netReceived?.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{s.toPay?.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{s.margin?.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{s.paid?.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                    <span className={(s.balance || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                      {s.balance?.toLocaleString()}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <Calculator className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No settlement data yet. Add your first settlement to see Excel-like calculations.</p>
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
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Add Daily Settlement</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="ml-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-8">
              Record a new daily card settlement entry
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <div>
                  <DatePicker
                    label="Date"
                    required
                    value={formData.date}
                    onChange={(v) => setFormData({...formData, date: v})}
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
