'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Monitor, Search, Download } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { RoleGuard } from '@/components/RoleGuard'
import { TableSkeleton } from '@/components/ui/skeleton'
import { FilterPanel, FilterButton } from '@/components/ui/filter-panel'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { TablePagination, getPaginatedSlice, getTotalPages } from '@/components/ui/table-pagination'
import { matchesDateRange } from '@/lib/date-range'
import { DateRangeFilter } from '@/components/ui/date-range-filter'

interface Machine {
  _id: string
  name: string
  description: string
  isActive: boolean
  createdBy?: { name: string }
  updatedBy?: { name: string }
  createdAt: string
  updatedAt: string
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const [deletingMachine, setDeletingMachine] = useState<Machine | null>(null)
  const [submitting, setSubmitting] = useState(false)
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
  const [formData, setFormData] = useState({ name: '', description: '', isActive: true })

  const filterFields = [
    { key: 'name', label: 'Name', type: 'text' as const, placeholder: 'Filter by name...' },
    { key: 'status', label: 'Status', type: 'select' as const, options: [
      { value: 'all', label: 'All Status' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]},
  ]

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length

  useEffect(() => {
    fetchMachines()
  }, [])

  const fetchMachines = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth('/api/machines')
      if (response.ok) {
        const data = await response.json()
        setMachines((data.machines || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      } else {
        toast.error('Failed to load machines')
      }
    } catch {
      toast.error('Failed to load machines')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Machine name is required')
      return
    }
    setSubmitting(true)
    try {
      const url = editingMachine ? `/api/machines/${editingMachine._id}` : '/api/machines'
      const method = editingMachine ? 'PUT' : 'POST'
      const response = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        toast.success(editingMachine ? 'Machine updated' : 'Machine created')
        setShowModal(false)
        setEditingMachine(null)
        setFormData({ name: '', description: '', isActive: true })
        fetchMachines()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to save machine')
      }
    } catch {
      toast.error('Failed to save machine')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingMachine) return
    setDeleting(true)
    try {
      const response = await fetchWithAuth(`/api/machines/${deletingMachine._id}`, { method: 'DELETE' })
      const data = await response.json()
      if (response.ok) {
        toast.success('Machine deleted')
        setShowDeleteDialog(false)
        setDeletingMachine(null)
        fetchMachines()
      } else {
        toast.error(data.error || 'Failed to delete machine')
      }
    } catch {
      toast.error('Failed to delete machine')
    } finally {
      setDeleting(false)
    }
  }

  const filteredMachines = machines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesName = !filters.name || m.name.toLowerCase().includes(filters.name.toLowerCase())
    const matchesStatus = !filters.status || filters.status === 'all' ||
      (filters.status === 'active' ? m.isActive : !m.isActive)
    return matchesSearch && matchesName && matchesStatus && matchesDateRange(m.createdAt, dateRangeFilter, dateRangeStart, dateRangeEnd)
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filters, machines, itemsPerPage, dateRangeFilter, dateRangeStart, dateRangeEnd])

  const paginatedMachines = getPaginatedSlice(filteredMachines, currentPage, itemsPerPage)
  const totalPages = getTotalPages(filteredMachines.length, itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Machine Names</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage machine names and descriptions for POS machines</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const { exportToExcel } = require('@/lib/excelExport')
                exportToExcel({
                  filename: 'machines_report',
                  sheetName: 'Machines',
                  columns: [
                    { key: 'name', label: 'Name', width: 24 },
                    { key: 'description', label: 'Description', width: 36 },
                    { key: 'createdByDate', label: 'Created By / Date', width: 30 },
                    { key: 'updatedByDate', label: 'Updated By / Date', width: 30 },
                    { key: 'status', label: 'Status', width: 14 },
                  ],
                  data: filteredMachines.map(m => ({
                    ...m,
                    status: m.isActive ? 'Active' : 'Inactive',
                    createdByDate: `${m.createdBy?.name || '—'} | ${format(new Date(m.createdAt), 'dd-MMM-yyyy HH:mm')}`,
                    updatedByDate: `${m.updatedBy?.name || '—'} | ${format(new Date(m.updatedAt), 'dd-MMM-yyyy HH:mm')}`,
                  })),
                  title: 'Machine Names Report',
                  isRTL: false
                })
              }}
              className="btn-secondary inline-flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => { setEditingMachine(null); setFormData({ name: '', description: '', isActive: true }); setShowModal(true) }}
              className="dubai-button inline-flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Machine Name
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search machine names..."
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
            {/* Mobile filter button */}
            <div className="md:hidden">
              <FilterButton onClick={() => { setTempFilters(filters); setShowFilter(true) }} activeCount={activeFilterCount} />
            </div>
          </div>
          
          {/* Desktop filters - show directly */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filterFields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select 
                    className="form-select text-sm" 
                    value={tempFilters[field.key] ?? 'all'} 
                    onChange={(e) => setTempFilters(prev => ({ ...prev, [field.key]: e.target.value }))}
                  >
                    {field.options?.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-input text-sm"
                    placeholder={field.placeholder || `Filter by ${field.label.toLowerCase()}...`}
                    value={tempFilters[field.key] ?? ''}
                    onChange={(e) => setTempFilters(prev => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setFilters(tempFilters)
                  setCurrentPage(1)
                }}
                className="dubai-button text-sm px-4 py-2"
              >
                Apply Filters
              </button>
              {(Object.values(filters).some(v => v && v !== 'all') || Object.values(tempFilters).some(v => v && v !== 'all')) && (
                <button
                  onClick={() => {
                    setFilters({})
                    setTempFilters({})
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
        </div>

        <FilterPanel
          open={showFilter}
          onClose={() => { setTempFilters(filters); setShowFilter(false) }}
          fields={filterFields}
          values={tempFilters}
          onChange={(key, value) => setTempFilters(prev => ({ ...prev, [key]: value }))}
          onApply={() => {
            setFilters(tempFilters)
            setShowFilter(false)
            setCurrentPage(1)
          }}
          onReset={() => { setTempFilters({}); setFilters({}) }}
          activeCount={activeFilterCount}
        />

        {/* Table */}
        <div className="mt-6">
          {loading ? (
            <TableSkeleton rows={4} columns={5} />
          ) : filteredMachines.length === 0 ? (
            <div className="dubai-card text-center py-12">
              <Monitor className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                {searchTerm ? 'No machine names found' : 'No machine names yet'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Try a different search term' : 'Create your first machine name'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto dubai-card !p-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created By / Date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Updated By / Date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
                  {paginatedMachines.map((machine) => (
                    <tr key={machine._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {machine.name}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                        {machine.description || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        <div className="meta-compact">
                          <div className="meta-compact-name">{machine.createdBy?.name || '—'}</div>
                          <div className="meta-compact-date">{format(new Date(machine.createdAt), 'dd-MMM-yyyy HH:mm')}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        <div className="meta-compact">
                          <div className="meta-compact-name">{machine.updatedBy?.name || '—'}</div>
                          <div className="meta-compact-date">{format(new Date(machine.updatedAt), 'dd-MMM-yyyy HH:mm')}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          machine.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        }`}>
                          {machine.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingMachine(machine)
                              setFormData({ name: machine.name, description: machine.description || '', isActive: machine.isActive ?? true })
                              setShowModal(true)
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setDeletingMachine(machine); setShowDeleteDialog(true) }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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

        {!loading && filteredMachines.length > 0 && (
          <TablePagination
            totalItems={filteredMachines.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content form-modal">
              <div className="modal-header">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{editingMachine ? 'Edit Machine Name' : 'Add Machine Name'}</h3>
                </div>
                <button type="button" onClick={() => { setShowModal(false); setEditingMachine(null) }} className="modal-close-btn">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Name *</label>
                  <input type="text" required className="form-input" placeholder="Machine name"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} placeholder="Optional description"
                    value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-select" value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button type="button" onClick={() => { setShowModal(false); setEditingMachine(null) }} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={submitting || !formData.name.trim()} className="dubai-button disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? 'Saving...' : (editingMachine ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteDialog && deletingMachine && (
          <div className="modal-overlay">
            <div className="modal-content max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete Machine Name</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete <strong>{deletingMachine.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDeleteDialog(false)} disabled={deleting} className="btn-secondary disabled:opacity-50">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="btn-danger disabled:opacity-50 inline-flex items-center gap-2">
                  {deleting ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Deleting...</> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}