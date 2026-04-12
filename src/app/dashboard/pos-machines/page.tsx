'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, Search, Smartphone, Monitor, MapPin, User, Hash, CreditCard, Wifi, Download } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/components/LanguageProvider'
import { TableSkeleton, FormSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingButton } from '@/components/ui/loading-button'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useOptimistic } from '@/hooks/useOptimistic'
import { RoleGuard } from '@/components/RoleGuard'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { FilterPanel, FilterButton } from '@/components/ui/filter-panel'
import { TablePagination, getPaginatedSlice, getTotalPages } from '@/components/ui/table-pagination'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { matchesDateRange } from '@/lib/date-range'
import { DateRangeFilter } from '@/components/ui/date-range-filter'

interface Agent {
  _id: string
  name: string
  email: string
  companyName?: string
}

interface POSMachine {
  _id: string
  machineName: string
  segment: string
  brand: 'Network' | 'RAKBank' | 'Geidea' | 'AFS' | 'Other'
  terminalId: string
  merchantId: string
  serialNumber: string
  model: string
  deviceType: 'android_pos' | 'traditional_pos'
  assignedAgent: Agent | null
  location: string
  bankCharges: number
  vatPercentage: number
  commissionPercentage: number
  status: 'active' | 'inactive' | 'maintenance'
  notes: string
  createdAt: string
  updatedAt?: string
  createdBy?: { name?: string } | null
  updatedBy?: { name?: string } | null
}

interface Stats {
  total: number
  active: number
  inactive: number
  maintenance: number
}

const brandColors: Record<string, string> = {
  'Network': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'RAKBank': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Geidea': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  'AFS': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  inactive: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
}

export default function POSMachines() {
  const { t } = useLanguage()
  const { user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [tempFilters, setTempFilters] = useState<Record<string, string>>({})
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>({})
  const [dateRangeFilter, setDateRangeFilter] = useState('all')
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [showModal, setShowModal] = useState(false)
  const [editingMachine, setEditingMachine] = useState<POSMachine | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingMachine, setDeletingMachine] = useState<POSMachine | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [brands, setBrands] = useState<{ _id: string, name: string }[]>([])
  const [segments, setSegments] = useState<{ _id: string, name: string }[]>([])
  const [machineNames, setMachineNames] = useState<{ _id: string, name: string }[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, maintenance: 0 })
  const [formData, setFormData] = useState({
    machineName: '',
    segment: '',
    brand: '',
    terminalId: '',
    merchantId: '',
    deviceType: 'traditional_pos' as string,
    assignedAgent: '',
    location: '',
    bankCharges: '',
    vatPercentage: '5',
    commissionPercentage: '',
    status: 'active' as string,
    notes: '',
  })

  const {
    data: machines,
    setData: setMachines,
    loading: optimisticLoading,
    optimisticAdd,
    optimisticUpdate,
    optimisticDelete
  } = useOptimistic<POSMachine>([], {
    successMessage: '',
    errorMessage: ''
  })

  useEffect(() => {
    fetchMachines()
    fetchBrands()
    fetchSegments()
    fetchMachineNames()
    if (isAdmin) fetchAgents()
    setPendingFilters(filters)
  }, [isAdmin, user])

  const fetchBrands = async () => {
    try {
      const response = await fetchWithAuth('/api/brands')
      if (response.ok) {
        const data = await response.json()
        setBrands(data.brands || [])
      }
    } catch (e) {
      console.error('Failed to fetch brands:', e)
    }
  }

  const fetchSegments = async () => {
    try {
      const response = await fetchWithAuth('/api/segments')
      if (response.ok) {
        const data = await response.json()
        setSegments(data.segments || [])
      }
    } catch (e) {
      console.error('Failed to fetch segments:', e)
    }
  }

  const fetchMachineNames = async () => {
    try {
      const response = await fetchWithAuth('/api/machines')
      if (response.ok) {
        const data = await response.json()
        setMachineNames((data.machines || []).filter((m: any) => m.isActive))
      }
    } catch (e) {
      console.error('Failed to fetch machine names:', e)
    }
  }

  const fetchBrandsBySegment = async (segment: string) => {
    if (!segment) {
      setBrands([])
      return
    }
    try {
      const response = await fetchWithAuth(`/api/brands/by-segment?segment=${encodeURIComponent(segment)}`)
      if (response.ok) {
        const data = await response.json()
        setBrands(data.brands || [])
      } else {
        setBrands([])
      }
    } catch (e) {
      console.error('Failed to fetch brands by segment:', e)
      setBrands([])
    }
  }

  const fetchMachines = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth('/api/pos-machines')
      if (response.ok) {
        const data = await response.json()
        setMachines((data.machines || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
        setStats(data.stats || { total: 0, active: 0, inactive: 0, maintenance: 0 })
      } else {
        const errorData = await response.json()
        toast.error(`Failed to load POS machines: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to fetch POS machines:', error)
      toast.error('Failed to load POS machines')
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
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
  }

  const filteredMachines = machines.filter(machine => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      machine.machineName?.toLowerCase().includes(search) ||
      machine.terminalId?.toLowerCase().includes(search) ||
      machine.merchantId?.toLowerCase().includes(search) ||
      machine.location?.toLowerCase().includes(search) ||
      machine.assignedAgent?.name?.toLowerCase().includes(search)
    const matchesName = !filters.name || filters.name === 'all' || machine.machineName?.toLowerCase().includes(filters.name.toLowerCase())
    const matchesStatus = !filters.status || filters.status === 'all' || machine.status === filters.status
    const matchesBrand = !filters.brand || filters.brand === 'all' || machine.brand === filters.brand
    const matchesSegment = !filters.segment || filters.segment === 'all' || machine.segment === filters.segment
    const matchesAgent = !isAdmin || !filters.agent || filters.agent === 'all' || machine.assignedAgent?._id === filters.agent
    const matchesDevice = !filters.device || filters.device === 'all' || machine.deviceType === filters.device
    return matchesSearch && matchesName && matchesStatus && matchesBrand && matchesSegment && matchesAgent && matchesDevice && matchesDateRange(machine.createdAt, dateRangeFilter, dateRangeStart, dateRangeEnd)
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filters, machines, itemsPerPage, dateRangeFilter, dateRangeStart, dateRangeEnd])

  const paginatedMachines = getPaginatedSlice(filteredMachines, currentPage, itemsPerPage)
  const totalPages = getTotalPages(filteredMachines.length, itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length

  const filterFields = [
    { key: 'name', label: 'Name', type: 'text' as const, placeholder: 'Filter by machine name...' },
    { key: 'segment', label: 'Segment', type: 'select' as const, options: [
      { value: 'all', label: 'All Segments' },
      ...segments.map(s => ({ value: s.name, label: s.name }))
    ]},
    { key: 'brand', label: 'Company/Brand', type: 'select' as const, options: [
      { value: 'all', label: 'All Company/Brands' },
      ...brands.map(b => ({ value: b.name, label: b.name }))
    ]},
    ...(isAdmin ? [{ key: 'agent', label: 'Agent Name', type: 'select' as const, options: [
      { value: 'all', label: 'All Agents' },
      ...agents.map(a => ({ value: a._id, label: a.name }))
    ]}] : []),
    { key: 'device', label: 'Device Type', type: 'select' as const, options: [
      { value: 'all', label: 'All Devices' },
      { value: 'traditional_pos', label: 'Traditional POS' },
      { value: 'android_pos', label: 'Android POS' },
    ]},
    { key: 'status', label: 'Status', type: 'select' as const, options: [
      { value: 'all', label: 'All Status' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'maintenance', label: 'Maintenance' },
    ]},
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate bank charges
    const bankCharges = parseFloat(formData.bankCharges) || 0
    if (bankCharges < 0 || bankCharges > 100) {
      toast.error('Bank charges must be between 0 and 100%')
      return
    }

    // Validate VAT percentage
    const vatPercentage = parseFloat(formData.vatPercentage) || 5
    if (vatPercentage < 0 || vatPercentage > 100) {
      toast.error('VAT percentage must be between 0 and 100')
      return
    }

    // Validate commission percentage
    const commissionPercentage = parseFloat(formData.commissionPercentage) || 0
    if (commissionPercentage < 0 || commissionPercentage > 100) {
      toast.error('Commission percentage must be between 0 and 100')
      return
    }

    const submitData = {
      ...formData,
      bankCharges,
      vatPercentage,
      commissionPercentage
    }

    setSubmitting(true)

    try {
      if (editingMachine) {
        const response = await fetch(`/api/pos-machines/${editingMachine._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...submitData,
            machineName: formData.machineName,
            serialNumber: '',
            model: '',
            vatPercentage: submitData.vatPercentage || 5
          })
        })
        
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Update failed')
        }
        
        toast.success('POS Machine updated successfully')
      } else {
        const response = await fetch('/api/pos-machines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...submitData,
            machineName: formData.machineName,
            serialNumber: '',
            model: '',
            vatPercentage: submitData.vatPercentage || 5
          })
        })
        
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Creation failed')
        }
        
        toast.success('POS Machine added successfully')
      }
      
      // Only close modal and reset form on success
      setShowModal(false)
      setEditingMachine(null)
      resetForm()
      fetchMachines()
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to save POS machine')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (machine: POSMachine) => {
    setEditingMachine(machine)
    setFormData({
      machineName: machine.machineName || '',
      segment: machine.segment || '',
      brand: machine.brand,
      terminalId: machine.terminalId,
      merchantId: machine.merchantId,
      deviceType: machine.deviceType,
      assignedAgent: machine.assignedAgent?._id || '',
      location: machine.location || '',
      bankCharges: machine.bankCharges?.toString() || '',
      vatPercentage: machine.vatPercentage?.toString() || '5',
      commissionPercentage: machine.commissionPercentage?.toString() || '',
      status: machine.status,
      notes: machine.notes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deletingMachine) return
    setDeleting(true)
    try {
      await optimisticDelete(
        deletingMachine._id,
        async () => {
          const response = await fetch(`/api/pos-machines/${deletingMachine._id}`, { method: 'DELETE' })
          if (!response.ok) throw new Error('Delete failed')
        }
      )
      setShowDeleteDialog(false)
      setDeletingMachine(null)
      fetchMachines()
    } catch {
      toast.error('Failed to delete POS machine')
    } finally {
      setDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      machineName: '', segment: '', brand: '', terminalId: '', merchantId: '',
      deviceType: 'traditional_pos', assignedAgent: '', location: '', bankCharges: '', vatPercentage: '5', commissionPercentage: '',
      status: 'active', notes: '',
    })
  }

  const deviceTypeLabel = (type: string) => type === 'android_pos' ? 'Android POS' : 'Traditional POS'
  const formatAudit = (name?: string, date?: string) => `${name || '—'} | ${date ? format(new Date(date), 'dd-MMM-yyyy HH:mm') : '—'}`

  return (
    <RoleGuard allowedRoles={['admin', 'agent']}>
    <ErrorBoundary>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">POS Machines</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stats.total} machines &middot; {stats.active} active &middot; {stats.maintenance} in maintenance
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const { exportToExcel } = require('@/lib/excelExport')
                  exportToExcel({
                    filename: 'pos_machines_report',
                    sheetName: 'POS Machines',
                    columns: [
                      { key: 'machineName', label: 'Machine Name', width: 22 },
                      { key: 'segment', label: 'Segment', width: 18 },
                      { key: 'brand', label: 'Company/Brand', width: 18 },
                      { key: 'terminalId', label: 'Terminal', width: 18 },
                      { key: 'merchantId', label: 'Merchant', width: 18 },
                      { key: 'agentName', label: 'Agent Name', width: 24 },
                      { key: 'deviceType', label: 'Device', width: 18 },
                      { key: 'commissionPercentage', label: 'Charges (%)', width: 14 },
                      { key: 'bankCharges', label: 'Bank Charges', width: 14 },
                      { key: 'vatPercentage', label: 'VAT', width: 12 },
                      { key: 'location', label: 'Location', width: 20 },
                      { key: 'status', label: 'Status', width: 14 },
                      { key: 'createdByDate', label: 'Created By / Date', width: 30 },
                      { key: 'updatedByDate', label: 'Updated By / Date', width: 30 },
                    ],
                    data: filteredMachines.map(m => ({
                      ...m,
                      machineName: m.machineName || '—',
                      agentName: m.assignedAgent?.name || 'Unassigned',
                      deviceType: m.deviceType === 'android_pos' ? 'Android POS' : 'Traditional POS',
                      commissionPercentage: `${(m.commissionPercentage || 0).toFixed(2)}%`,
                      bankCharges: `${(m.bankCharges || 0).toFixed(2)}%`,
                      vatPercentage: `${m.vatPercentage || 5}%`,
                      status: m.status.charAt(0).toUpperCase() + m.status.slice(1),
                      createdByDate: formatAudit(m.createdBy?.name, m.createdAt),
                      updatedByDate: formatAudit(m.updatedBy?.name, m.updatedAt || m.createdAt),
                    })),
                    title: 'POS Machines Report',
                    isRTL: false
                  })
                }}
                className="btn-secondary inline-flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <LoadingButton
                onClick={() => { resetForm(); setShowModal(true) }}
                loading={optimisticLoading}
                className="dubai-button inline-flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Machine
              </LoadingButton>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="mt-5 stat-grid">
          {[
            { label: 'Total',       value: String(stats.total),       color: 'text-gray-900 dark:text-white' },
            { label: 'Active',      value: String(stats.active),      color: 'text-green-500 dark:text-green-400' },
            { label: 'Inactive',    value: String(stats.inactive),    color: 'text-red-500 dark:text-red-400' },
            { label: 'Maintenance', value: String(stats.maintenance), color: 'text-yellow-500 dark:text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <span className="stat-card-label">{label}</span>
              <span className={`stat-card-value ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="form-input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Desktop Filters - Always Visible */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Name
              </label>
              <input
                type="text"
                placeholder="Filter by machine name..."
                className="form-input text-sm"
                value={pendingFilters.name || ''}
                onChange={(e) => setPendingFilters(prev => ({ ...prev, name: e.target.value }))}
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
                    brand: value === 'all' ? 'all' : prev.brand
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
                onChange={(value) => setPendingFilters(prev => ({ ...prev, brand: value }))}
                options={[
                  { value: 'all', label: 'All Brands' },
                  ...brands.filter(b => !pendingFilters.segment || pendingFilters.segment === 'all' || 
                    machines.some(m => m.segment === pendingFilters.segment && m.brand === b.name)
                  ).map(b => ({ value: b.name, label: b.name }))
                ]}
                placeholder="Select Brand"
              />
            </div>

            {isAdmin && (
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
                    ...agents.map(a => ({ value: a._id, label: a.name }))
                  ]}
                  placeholder="Select Agent"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Device
              </label>
              <SearchableSelect
                className="text-sm"
                value={pendingFilters.device || 'all'}
                onChange={(value) => setPendingFilters(prev => ({ ...prev, device: value }))}
                options={[
                  { value: 'all', label: 'All Devices' },
                  { value: 'traditional_pos', label: 'Traditional POS' },
                  { value: 'android_pos', label: 'Android POS' },
                ]}
                placeholder="Select Device"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Status
              </label>
              <SearchableSelect
                className="text-sm"
                value={pendingFilters.status || 'all'}
                onChange={(value) => setPendingFilters(prev => ({ ...prev, status: value }))}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'maintenance', label: 'Maintenance' },
                ]}
                placeholder="Select Status"
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
                    setDateRangeFilter('all')
                    setDateRangeStart('')
                    setDateRangeEnd('')
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors px-3 py-2 rounded-lg border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:hover:border-red-700"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Date Range Filter - Separate Row */}
          <div className="hidden md:flex items-center gap-4">
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
          </div>

          {/* Mobile Filter Button */}
          <div className="md:hidden flex gap-2">
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
            <FilterButton onClick={() => { setPendingFilters(filters); setShowFilter(true) }} activeCount={activeFilterCount} />
          </div>
        </div>

        <FilterPanel
          open={showFilter}
          onClose={() => { setPendingFilters(filters); setShowFilter(false) }}
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

        {/* Machines List */}
        <div className="mt-6">
          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : filteredMachines.length === 0 ? (
            <div className="dubai-card text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                {searchTerm ? 'No machines found' : 'No POS machines yet'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Try adjusting your search or filters' : 'Start by adding POS machines and assigning them to agents.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto dubai-card !p-0">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Machine Name</div></th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Segment</div></th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Company/Brand</div></th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Terminal</div></th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Merchant</div></th>
                      {isAdmin && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Agent Name</div></th>}
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Device</div></th>
                      {isAdmin && (
                        <>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Margin</div></th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Bank Charges</div></th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Vat</div></th>
                        </>
                      )}
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Location</div></th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Status</div></th>
                      {isAdmin && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Created By / Date</div></th>}
                      {isAdmin && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Updated By / Date</div></th>}
                      {isAdmin && <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"><div className="whitespace-nowrap">Actions</div></th>}
                    </tr></thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
                    {paginatedMachines.map((machine) => (
                      <tr key={machine._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {machine.machineName || '—'}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {machine.segment || '—'}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${brandColors[machine.brand] || 'bg-gray-100 text-gray-800'}`}>
                            {machine.brand}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Hash className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="font-mono font-medium text-sm text-gray-900 dark:text-gray-100">{machine.terminalId}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-100">{machine.merchantId}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {machine.assignedAgent ? (
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-sm font-medium">{machine.assignedAgent.name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic whitespace-nowrap">Unassigned</span>
                            )}
                          </td>
                        )}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            {machine.deviceType === 'android_pos'
                              ? <Smartphone className="h-4 w-4 text-gray-400" />
                              : <Monitor className="h-4 w-4 text-gray-400" />
                            }
                            <span className="text-sm">{deviceTypeLabel(machine.deviceType)}</span>
                          </div>
                        </td>
                        {isAdmin && (
                          <>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {machine.commissionPercentage?.toFixed(2) || '0.00'}%
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {machine.bankCharges?.toFixed(2) || '0.00'}%
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {machine.vatPercentage || 5}%
                              </span>
                            </td>
                          </>
                        )}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {machine.location ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              {machine.location}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 whitespace-nowrap">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${statusColors[machine.status]}`}>
                            {machine.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                            <div className="meta-compact">
                              <div className="meta-compact-name">{machine.createdBy?.name || '—'}</div>
                              <div className="meta-compact-date">{machine.createdAt ? format(new Date(machine.createdAt), 'dd-MMM-yyyy HH:mm') : '—'}</div>
                            </div>
                          </td>
                        )}
                        {isAdmin && (
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                            <div className="meta-compact">
                              <div className="meta-compact-name">{machine.updatedBy?.name || '—'}</div>
                              <div className="meta-compact-date">{(machine.updatedAt || machine.createdAt) ? format(new Date(machine.updatedAt || machine.createdAt), 'dd-MMM-yyyy HH:mm') : '—'}</div>
                            </div>
                          </td>
                        )}
                        {isAdmin && (
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleEdit(machine)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={() => { setDeletingMachine(machine); setShowDeleteDialog(true) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {paginatedMachines.map((machine) => (
                  <div key={machine._id} className="dubai-card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                          {machine.deviceType === 'android_pos'
                            ? <Smartphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            : <Monitor className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          }
                        </div>
                        <div>

                          <p className="font-mono font-medium text-sm text-gray-900 dark:text-white">{machine.machineName || machine.terminalId}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">TID: {machine.terminalId} | MID: {machine.merchantId}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[machine.status]}`}>
                        {machine.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Segment</span>
                        <span className="text-xs">{machine.segment || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Company/Brand</span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${brandColors[machine.brand]}`}>
                          {machine.brand}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Type</span>
                        <span className="text-xs">{deviceTypeLabel(machine.deviceType)}</span>
                      </div>
                      {isAdmin && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Charges</span>
                            <span className="text-xs font-medium">{machine.commissionPercentage?.toFixed(2) || '0.00'}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">Bank Charges</span>
                            <span className="text-xs font-medium">{machine.bankCharges?.toFixed(2) || '0.00'}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">VAT</span>
                            <span className="text-xs font-medium">{machine.vatPercentage || 5}%</span>
                          </div>
                        </>
                      )}
                      {isAdmin && machine.assignedAgent && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Agent</span>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            <span className="text-xs font-medium">{machine.assignedAgent.name}</span>
                          </div>
                        </div>
                      )}
                      {machine.location && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Location</span>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            <span className="text-xs">{machine.location}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex justify-end gap-1 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button onClick={() => handleEdit(machine)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setDeletingMachine(machine); setShowDeleteDialog(true) }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && filteredMachines.length > 0 && (
            <TablePagination
              totalItems={filteredMachines.length}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content form-modal">
              <div className="modal-header">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {editingMachine ? 'Edit POS Machine' : 'Add New POS Machine'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {editingMachine ? 'Update machine details' : 'Register a new POS machine and assign it to an agent'}
                  </p>
                </div>
                <button type="button" onClick={() => { setShowModal(false); setEditingMachine(null); resetForm() }} className="modal-close-btn">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {optimisticLoading ? (
                <FormSkeleton fields={7} />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Section: Machine Identity */}
                  <div className="form-section">
                    <p className="form-section-title">Machine Identity</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Segment *</label>
                        <select required className="form-select" value={formData.segment} onChange={(e) => {
                          const newSegment = e.target.value
                          setFormData({...formData, segment: newSegment, brand: ''})
                          fetchBrandsBySegment(newSegment)
                        }}>
                          <option value="" disabled>Select Segment</option>
                          {segments.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                        </select>
                        {segments.length === 0 && <p className="text-xs text-amber-500 mt-1">Create Segments in Admin Panel first</p>}
                      </div>
                      <div>
                        <label className="form-label">Company/Brand *</label>
                        <select required className="form-select" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} disabled={!formData.segment}>
                          <option value="" disabled>Select Company/Brand</option>
                          {brands.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                        </select>
                        {!formData.segment && <p className="text-xs text-gray-500 mt-1">Select a segment first</p>}
                        {formData.segment && brands.length === 0 && <p className="text-xs text-amber-500 mt-1">No brands available for this segment</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Machine Name *</label>
                        <select required className="form-select" value={formData.machineName} onChange={(e) => setFormData({...formData, machineName: e.target.value})}>
                          <option value="" disabled>Select Machine Name</option>
                          {machineNames.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
                        </select>
                        {machineNames.length === 0 && <p className="text-xs text-amber-500 mt-1">Create Machine Names in Admin Panel first</p>}
                      </div>
                      <div>
                        <label className="form-label">Assign to Agent</label>
                        <select className="form-select" value={formData.assignedAgent} onChange={(e) => setFormData({...formData, assignedAgent: e.target.value})}>
                          <option value="">— Unassigned —</option>
                          {agents.map(agent => (
                            <option key={agent._id} value={agent._id}>{agent.name}{agent.companyName ? ` (${agent.companyName})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section: Terminal IDs */}
                  <div className="form-section">
                    <p className="form-section-title">Terminal Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Terminal ID (TID) *</label>
                        <input type="text" required className="form-input font-mono uppercase" placeholder="e.g. 14100615"
                          value={formData.terminalId}
                          onChange={(e) => setFormData({...formData, terminalId: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()})}
                          maxLength={20}
                        />
                        <p className="text-xs text-gray-400 mt-1">Letters and numbers only</p>
                      </div>
                      <div>
                        <label className="form-label">Merchant ID (MID) *</label>
                        <input type="text" required className="form-input font-mono" placeholder="e.g. 200602374829"
                          value={formData.merchantId}
                          onChange={(e) => setFormData({...formData, merchantId: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Device Type *</label>
                      <select required className="form-select" value={formData.deviceType} onChange={(e) => setFormData({...formData, deviceType: e.target.value})}>
                        <option value="traditional_pos">Traditional POS</option>
                        <option value="android_pos">Android POS</option>
                      </select>
                    </div>
                  </div>

                  {/* Section: Financial */}
                  <div className="form-section">
                    <p className="form-section-title">Financial Settings</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="form-label">Charges (%)</label>
                        <input type="number" step="0.01" min="0" max="100" className="form-input" placeholder="0.00"
                          value={formData.commissionPercentage}
                          onChange={(e) => { const v = e.target.value; if (v === '' || (parseFloat(v) >= 0 && parseFloat(v) <= 100)) setFormData({...formData, commissionPercentage: v}) }}
                        />
                      </div>
                      <div>
                        <label className="form-label">Bank Charges (%)</label>
                        <input type="number" step="0.01" min="0" max="100" className="form-input" placeholder="0.00"
                          value={formData.bankCharges}
                          onChange={(e) => { const v = e.target.value; if (v === '' || (parseFloat(v) >= 0 && parseFloat(v) <= 100)) setFormData({...formData, bankCharges: v}) }}
                        />
                      </div>
                      <div>
                        <label className="form-label">VAT (%)</label>
                        <input type="number" step="0.01" min="0" max="100" className="form-input" placeholder="5.00"
                          value={formData.vatPercentage}
                          onChange={(e) => { const v = e.target.value; if (v === '' || (parseFloat(v) >= 0 && parseFloat(v) <= 100)) setFormData({...formData, vatPercentage: v}) }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section: Assignment & Status */}
                  <div className="form-section">
                    <p className="form-section-title">Location & Status</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Location</label>
                        <input type="text" className="form-input" placeholder="Ras Al Khor, Dubai"
                          value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="form-label">Status</label>
                        <select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Notes</label>
                      <textarea className="form-input" rows={2} placeholder="Any additional notes..."
                        value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <LoadingButton type="button" onClick={() => { setShowModal(false); setEditingMachine(null); resetForm() }} variant="secondary">
                      {t('cancel')}
                    </LoadingButton>
                    <LoadingButton type="submit" loading={submitting} variant="primary"
                      disabled={submitting || !formData.machineName.trim() || !formData.segment || !formData.brand || !formData.terminalId.trim() || !formData.merchantId.trim()}
                    >
                      {editingMachine ? 'Update Machine' : 'Add Machine'}
                    </LoadingButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && deletingMachine && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete POS Machine</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete terminal <strong>{deletingMachine.terminalId}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteDialog(false); setDeletingMachine(null) }}
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
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
    </RoleGuard>
  )
}
