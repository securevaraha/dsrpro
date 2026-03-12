'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, Smartphone, Monitor, MapPin, User, Hash, CreditCard, Wifi } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/components/LanguageProvider'
import { TableSkeleton, FormSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingButton } from '@/components/ui/loading-button'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useOptimistic } from '@/hooks/useOptimistic'
import { RoleGuard } from '@/components/RoleGuard'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface Agent {
  _id: string
  name: string
  email: string
  companyName?: string
}

interface POSMachine {
  _id: string
  terminalId: string
  merchantId: string
  serialNumber: string
  model: string
  brand: 'Network' | 'RAKBank' | 'Geidea' | 'AFS' | 'Other'
  deviceType: 'android_pos' | 'traditional_pos'
  assignedAgent: Agent | null
  location: string
  status: 'active' | 'inactive' | 'maintenance'
  notes: string
  createdAt: string
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
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingMachine, setEditingMachine] = useState<POSMachine | null>(null)
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<Agent[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, maintenance: 0 })
  const [formData, setFormData] = useState({
    terminalId: '',
    merchantId: '',
    serialNumber: '',
    model: '',
    brand: 'Network' as string,
    deviceType: 'traditional_pos' as string,
    assignedAgent: '',
    location: '',
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
    successMessage: 'Operation completed successfully',
    errorMessage: 'Operation failed. Please try again.'
  })

  useEffect(() => {
    fetchMachines()
    if (isAdmin) fetchAgents()
  }, [isAdmin])

  const fetchMachines = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pos-machines')
      if (response.ok) {
        const data = await response.json()
        setMachines(data.machines || [])
        setStats(data.stats || { total: 0, active: 0, inactive: 0, maintenance: 0 })
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
      const response = await fetch('/api/users?role=agent')
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
      machine.terminalId?.toLowerCase().includes(search) ||
      machine.merchantId?.toLowerCase().includes(search) ||
      machine.serialNumber?.toLowerCase().includes(search) ||
      machine.model?.toLowerCase().includes(search) ||
      machine.location?.toLowerCase().includes(search) ||
      machine.assignedAgent?.name?.toLowerCase().includes(search)
    const matchesStatus = statusFilter === 'all' || machine.status === statusFilter
    const matchesBrand = brandFilter === 'all' || machine.brand === brandFilter
    return matchesSearch && matchesStatus && matchesBrand
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingMachine) {
      await optimisticUpdate(
        editingMachine._id,
        {} as any,
        async () => {
          const response = await fetch(`/api/pos-machines/${editingMachine._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          })
          if (!response.ok) {
            const err = await response.json()
            throw new Error(err.error || 'Update failed')
          }
          const data = await response.json()
          return data.machine
        }
      )
    } else {
      const tempMachine: POSMachine = {
        _id: `temp-${Date.now()}`,
        ...formData,
        brand: formData.brand as POSMachine['brand'],
        deviceType: formData.deviceType as POSMachine['deviceType'],
        status: formData.status as POSMachine['status'],
        assignedAgent: agents.find(a => a._id === formData.assignedAgent) || null,
        createdAt: new Date().toISOString(),
      }

      await optimisticAdd(
        tempMachine,
        async () => {
          const response = await fetch('/api/pos-machines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          })
          if (!response.ok) {
            const err = await response.json()
            throw new Error(err.error || 'Creation failed')
          }
          const data = await response.json()
          return data.machine
        }
      )
    }

    setShowModal(false)
    setEditingMachine(null)
    resetForm()
    fetchMachines()
  }

  const handleEdit = (machine: POSMachine) => {
    setEditingMachine(machine)
    setFormData({
      terminalId: machine.terminalId,
      merchantId: machine.merchantId,
      serialNumber: machine.serialNumber,
      model: machine.model || '',
      brand: machine.brand,
      deviceType: machine.deviceType,
      assignedAgent: machine.assignedAgent?._id || '',
      location: machine.location || '',
      status: machine.status,
      notes: machine.notes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (machine: POSMachine) => {
    if (window.confirm(`Delete POS machine ${machine.terminalId}? This action cannot be undone.`)) {
      await optimisticDelete(
        machine._id,
        async () => {
          const response = await fetch(`/api/pos-machines/${machine._id}`, { method: 'DELETE' })
          if (!response.ok) throw new Error('Delete failed')
        }
      )
      fetchMachines()
    }
  }

  const resetForm = () => {
    setFormData({
      terminalId: '', merchantId: '', serialNumber: '', model: '',
      brand: 'Network', deviceType: 'traditional_pos', assignedAgent: '',
      location: '', status: 'active', notes: '',
    })
  }

  const deviceTypeLabel = (type: string) => type === 'android_pos' ? 'Android POS' : 'Traditional POS'

  return (
    <RoleGuard allowedRoles={['admin', 'agent']}>
    <ErrorBoundary>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">POS Machines</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stats.total} machines &middot; {stats.active} active &middot; {stats.maintenance} in maintenance
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="mt-4 sm:mt-0">
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
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="dubai-card p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="dubai-card p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.active}</p>
          </div>
          <div className="dubai-card p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inactive</p>
            <p className="text-2xl font-bold text-red-500 dark:text-red-400 mt-1">{stats.inactive}</p>
          </div>
          <div className="dubai-card p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Maintenance</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.maintenance}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by TID, MID, serial, location, agent..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="form-select w-auto"
          >
            <option value="all">All Brands</option>
            <option value="Network">Network</option>
            <option value="RAKBank">RAKBank</option>
            <option value="Geidea">Geidea</option>
            <option value="AFS">AFS</option>
            <option value="Other">Other</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select w-auto"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        {/* Machines List */}
        <div className="mt-6">
          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : filteredMachines.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-12 w-12" />}
              title={searchTerm ? 'No machines found' : 'No POS machines yet'}
              description={searchTerm
                ? 'Try adjusting your search or filters'
                : 'Start by adding POS machines and assigning them to agents.'
              }
              action={!searchTerm && isAdmin ? (
                <LoadingButton onClick={() => setShowModal(true)} className="dubai-button">
                  <Plus className="h-4 w-4 mr-2" /> Add Machine
                </LoadingButton>
              ) : undefined}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-hidden dubai-card !p-0">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Terminal / Merchant</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Brand</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agent</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      {isAdmin && <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>}
                    </tr></thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
                    {filteredMachines.map((machine) => (
                      <tr key={machine._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Hash className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <span className="font-mono font-medium text-sm text-gray-900 dark:text-gray-100">{machine.terminalId}</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-[18px]">
                              MID: {machine.merchantId}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-[18px]">
                              S/N: {machine.serialNumber}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {machine.deviceType === 'android_pos'
                              ? <Smartphone className="h-4 w-4 text-gray-400" />
                              : <Monitor className="h-4 w-4 text-gray-400" />
                            }
                            <div>
                              <span className="text-sm">{deviceTypeLabel(machine.deviceType)}</span>
                              {machine.model && (
                                <p className="text-xs text-gray-400 dark:text-gray-500">{machine.model}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${brandColors[machine.brand]}`}>
                            {machine.brand}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {machine.assignedAgent ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                {machine.assignedAgent.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{machine.assignedAgent.name}</p>
                                {machine.assignedAgent.companyName && (
                                  <p className="text-xs text-gray-400">{machine.assignedAgent.companyName}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {machine.location ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              {machine.location}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${statusColors[machine.status]}`}>
                            {machine.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleEdit(machine)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDelete(machine)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Delete">
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
                {filteredMachines.map((machine) => (
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
                          <p className="font-mono font-medium text-sm text-gray-900 dark:text-white">{machine.terminalId}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">MID: {machine.merchantId}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[machine.status]}`}>
                        {machine.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Serial</span>
                        <span className="font-mono text-xs">{machine.serialNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Brand</span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${brandColors[machine.brand]}`}>
                          {machine.brand}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Type</span>
                        <span className="text-xs">{deviceTypeLabel(machine.deviceType)}{machine.model ? ` · ${machine.model}` : ''}</span>
                      </div>
                      {machine.assignedAgent && (
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
                        <button onClick={() => handleDelete(machine)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                {editingMachine ? 'Edit POS Machine' : 'Add New POS Machine'}
              </h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-8">
                {editingMachine ? 'Update machine details' : 'Register a new POS machine and assign it to an agent'}
              </p>
              {optimisticLoading ? (
                <FormSkeleton fields={7} />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    <div>
                      <label className="form-label">Terminal ID (TID) *</label>
                      <input
                        type="text"
                        required
                        className="form-input font-mono"
                        placeholder="e.g. 14100615"
                        value={formData.terminalId}
                        onChange={(e) => setFormData({...formData, terminalId: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="form-label">Merchant ID (MID) *</label>
                      <input
                        type="text"
                        required
                        className="form-input font-mono"
                        placeholder="e.g. 200602374829"
                        value={formData.merchantId}
                        onChange={(e) => setFormData({...formData, merchantId: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="form-label">Device Serial Number *</label>
                      <input
                        type="text"
                        required
                        className="form-input font-mono"
                        placeholder="e.g. N960WC46335"
                        value={formData.serialNumber}
                        onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    <div>
                      <label className="form-label">Brand *</label>
                      <select
                        required
                        className="form-select"
                        value={formData.brand}
                        onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      >
                        <option value="Network">Network</option>
                        <option value="RAKBank">RAKBank</option>
                        <option value="Geidea">Geidea</option>
                        <option value="AFS">AFS</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Device Type *</label>
                      <select
                        required
                        className="form-select"
                        value={formData.deviceType}
                        onChange={(e) => setFormData({...formData, deviceType: e.target.value})}
                      >
                        <option value="traditional_pos">Traditional POS</option>
                        <option value="android_pos">Android POS</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Machine Model</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. N960, A920"
                        value={formData.model}
                        onChange={(e) => setFormData({...formData, model: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    <div>
                      <label className="form-label">Assign to Agent</label>
                      <select
                        className="form-select"
                        value={formData.assignedAgent}
                        onChange={(e) => setFormData({...formData, assignedAgent: e.target.value})}
                      >
                        <option value="">-- Unassigned --</option>
                        {agents.map(agent => (
                          <option key={agent._id} value={agent._id}>
                            {agent.name}{agent.companyName ? ` (${agent.companyName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Ras Al Khor, Dubai"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="Any additional notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-5 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <LoadingButton
                      type="button"
                      onClick={() => { setShowModal(false); setEditingMachine(null); resetForm() }}
                      variant="secondary"
                    >
                      {t('cancel')}
                    </LoadingButton>
                    <LoadingButton type="submit" loading={optimisticLoading} variant="primary">
                      {editingMachine ? 'Update Machine' : 'Add Machine'}
                    </LoadingButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
    </RoleGuard>
  )
}
