'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Tag, Search, Download } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { RoleGuard } from '@/components/RoleGuard'
import { TableSkeleton } from '@/components/ui/skeleton'
import { FilterPanel, FilterButton } from '@/components/ui/filter-panel'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { TablePagination, getPaginatedSlice, getTotalPages } from '@/components/ui/table-pagination'
import { matchesDateRange } from '@/lib/date-range'
import { DateRangeFilter } from '@/components/ui/date-range-filter'

interface Brand {
  _id: string
  name: string
  description: string
  segment?: string
  isActive: boolean
  createdBy?: { name: string }
  updatedBy?: { name: string }
  createdAt: string
  updatedAt: string
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [segments, setSegments] = useState<{ _id: string, name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null)
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
  const [formData, setFormData] = useState({ name: '', description: '', segment: '', isActive: true })

  const filterFields = [
    { key: 'name', label: 'Name', type: 'text' as const, placeholder: 'Filter by name...' },
    { key: 'segment', label: 'Segment', type: 'select' as const, options: [
      { value: 'all', label: 'All Segments' },
      ...segments.map(s => ({ value: s.name, label: s.name }))
    ]},
    { key: 'status', label: 'Status', type: 'select' as const, options: [
      { value: 'all', label: 'All Status' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]},
  ]

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length

  useEffect(() => {
    fetchBrands()
    fetchSegments()
  }, [])

  const fetchSegments = async () => {
    try {
      const response = await fetchWithAuth('/api/segments')
      if (response.ok) {
        const data = await response.json()
        console.log('Segments loaded:', data.segments) // Debug log
        setSegments(data.segments || [])
      } else {
        console.error('Failed to fetch segments:', response.status)
      }
    } catch (e) {
      console.error('Failed to fetch segments:', e)
    }
  }

  const fetchBrands = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth('/api/brands')
      if (response.ok) {
        const data = await response.json()
        console.log('Brands loaded:', data.brands) // Debug log
        setBrands((data.brands || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      } else {
        toast.error('Failed to load company/brands')
      }
    } catch {
      toast.error('Failed to load company/brands')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Company/Brand name is required')
      return
    }
    setSubmitting(true)
    console.log('Submitting form data:', formData) // Debug log
    try {
      const url = editingBrand ? `/api/brands/${editingBrand._id}` : '/api/brands'
      const method = editingBrand ? 'PUT' : 'POST'
      const response = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      console.log('API Response:', response.status) // Debug log
      if (response.ok) {
        const result = await response.json()
        console.log('API Result:', result) // Debug log
        toast.success(editingBrand ? 'Company/Brand updated' : 'Company/Brand created')
        setShowModal(false)
        setEditingBrand(null)
        setFormData({ name: '', description: '', segment: '', isActive: true })
        fetchBrands()
      } else {
        const data = await response.json()
        console.error('API Error:', data) // Debug log
        toast.error(data.error || 'Failed to save company/brand')
      }
    } catch {
      toast.error('Failed to save company/brand')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingBrand) return
    setDeleting(true)
    try {
      const response = await fetchWithAuth(`/api/brands/${deletingBrand._id}`, { method: 'DELETE' })
      const data = await response.json()
      if (response.ok) {
        toast.success('Company/Brand deleted')
        setShowDeleteDialog(false)
        setDeletingBrand(null)
        fetchBrands()
      } else {
        toast.error(data.error || 'Failed to delete company/brand')
      }
    } catch {
      toast.error('Failed to delete company/brand')
    } finally {
      setDeleting(false)
    }
  }

  const filteredBrands = brands.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.segment?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesName = !filters.name || b.name.toLowerCase().includes(filters.name.toLowerCase())
    const matchesSegment = !filters.segment || filters.segment === 'all' || b.segment === filters.segment
    const matchesStatus = !filters.status || filters.status === 'all' ||
      (filters.status === 'active' ? b.isActive : !b.isActive)
    return matchesSearch && matchesName && matchesSegment && matchesStatus && matchesDateRange(b.createdAt, dateRangeFilter, dateRangeStart, dateRangeEnd)
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filters, brands, itemsPerPage, dateRangeFilter, dateRangeStart, dateRangeEnd])

  const paginatedBrands = getPaginatedSlice(filteredBrands, currentPage, itemsPerPage)
  const totalPages = getTotalPages(filteredBrands.length, itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Company/Brand</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage POS machine company/brands</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const { exportToExcel } = require('@/lib/excelExport')
                exportToExcel({
                  filename: 'brands_report',
                  sheetName: 'Brands',
                  columns: [
                    { key: 'name', label: 'Name', width: 24 },
                    { key: 'segment', label: 'Segment', width: 20 },
                    { key: 'description', label: 'Description', width: 36 },
                    { key: 'createdByDate', label: 'Created By / Date', width: 30 },
                    { key: 'updatedByDate', label: 'Updated By / Date', width: 30 },
                    { key: 'status', label: 'Status', width: 14 },
                  ],
                  data: filteredBrands.map(b => ({
                    ...b,
                    segment: b.segment || '—',
                    status: b.isActive ? 'Active' : 'Inactive',
                    createdByDate: `${b.createdBy?.name || '—'} | ${format(new Date(b.createdAt), 'dd-MMM-yyyy HH:mm')}`,
                    updatedByDate: `${b.updatedBy?.name || '—'} | ${format(new Date(b.updatedAt), 'dd-MMM-yyyy HH:mm')}`,
                  })),
                  title: 'Company/Brand Report',
                  isRTL: false
                })
              }}
              className="btn-secondary inline-flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => { setEditingBrand(null); setFormData({ name: '', description: '', segment: '', isActive: true }); setShowModal(true) }}
              className="dubai-button inline-flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Company/Brand
            </button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="mt-5 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search company/brands..."
              className="form-input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Desktop Filters - Always Visible */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Name
              </label>
              <input
                type="text"
                placeholder="Filter by name..."
                className="form-input text-sm"
                value={tempFilters.name || ''}
                onChange={(e) => setTempFilters(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Segment
              </label>
              <SearchableSelect
                className="text-sm"
                value={tempFilters.segment || 'all'}
                onChange={(value) => setTempFilters(prev => ({ ...prev, segment: value }))}
                options={[
                  { value: 'all', label: 'All Segments' },
                  ...segments.map(s => ({ value: s.name, label: s.name }))
                ]}
                placeholder="Select Segment"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Status
              </label>
              <SearchableSelect
                className="text-sm"
                value={tempFilters.status || 'all'}
                onChange={(value) => setTempFilters(prev => ({ ...prev, status: value }))}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                placeholder="Select Status"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Date Range
              </label>
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
            <FilterButton onClick={() => { setTempFilters(filters); setShowFilter(true) }} activeCount={activeFilterCount} />
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
          ) : filteredBrands.length === 0 ? (
            <div className="dubai-card text-center py-12">
              <Tag className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                {searchTerm ? 'No company/brands found' : 'No company/brands yet'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Try a different search term' : 'Create your first company/brand'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto dubai-card !p-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Segment</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created By / Date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Updated By / Date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
                  {paginatedBrands.map((brand) => (
                    <tr key={brand._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {brand.name}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                        {brand.segment || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                        {brand.description || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        <div className="meta-compact">
                          <div className="meta-compact-name">{brand.createdBy?.name || '—'}</div>
                          <div className="meta-compact-date">{format(new Date(brand.createdAt), 'dd-MMM-yyyy HH:mm')}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        <div className="meta-compact">
                          <div className="meta-compact-name">{brand.updatedBy?.name || '—'}</div>
                          <div className="meta-compact-date">{format(new Date(brand.updatedAt), 'dd-MMM-yyyy HH:mm')}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          brand.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        }`}>
                          {brand.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingBrand(brand)
                              setFormData({ name: brand.name, description: brand.description || '', segment: brand.segment || '', isActive: brand.isActive ?? true })
                              setShowModal(true)
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setDeletingBrand(brand); setShowDeleteDialog(true) }}
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

        {!loading && filteredBrands.length > 0 && (
          <TablePagination
            totalItems={filteredBrands.length}
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
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{editingBrand ? 'Edit Company/Brand' : 'Add Company/Brand'}</h3>
                </div>
                <button type="button" onClick={() => { setShowModal(false); setEditingBrand(null) }} className="modal-close-btn">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Name *</label>
                  <input type="text" required className="form-input" placeholder="Company/Brand name"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Segment</label>
                  <select className="form-select" value={formData.segment} onChange={(e) => setFormData({ ...formData, segment: e.target.value })}>
                    <option value="">— No Segment —</option>
                    {segments.map(segment => (
                      <option key={segment._id} value={segment.name}>{segment.name}</option>
                    ))}
                  </select>
                  {segments.length === 0 ? (
                    <p className="text-xs text-amber-500 mt-1">Create Segments in Admin Panel first</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">{segments.length} segments available</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <input type="text" className="form-input" placeholder="Optional description"
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
                  <button type="button" onClick={() => { setShowModal(false); setEditingBrand(null) }} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={submitting || !formData.name.trim()} className="dubai-button disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? 'Saving...' : (editingBrand ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteDialog && deletingBrand && (
          <div className="modal-overlay">
            <div className="modal-content max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete Company/Brand</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete <strong>{deletingBrand.name}</strong>? This action cannot be undone.
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
