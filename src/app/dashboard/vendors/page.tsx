'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, Store, Building2, Phone, Mail, DollarSign } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/components/LanguageProvider'
import { TableSkeleton, FormSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingButton } from '@/components/ui/loading-button'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useOptimistic } from '@/hooks/useOptimistic'
import { RoleGuard } from '@/components/RoleGuard'

interface Vendor {
  _id: string
  name: string
  companyName: string
  phone: string
  email: string
  status: 'active' | 'inactive'
  role: string
  createdAt: string
}

export default function Vendors() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    password: '',
    role: 'vendor',
    address: '',
    bankDetails: '',
    status: 'active' as 'active' | 'inactive'
  })

  const {
    data: vendors,
    setData: setVendors,
    loading: optimisticLoading,
    optimisticAdd,
    optimisticUpdate,
    optimisticDelete
  } = useOptimistic<Vendor>([], {
    successMessage: 'Operation completed successfully',
    errorMessage: 'Operation failed. Please try again.'
  })

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users?role=vendor')
      if (response.ok) {
        const data = await response.json()
        setVendors(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
      toast.error('Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch =
      vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const activeCount = vendors.filter(v => v.status === 'active').length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingVendor) {
      await optimisticUpdate(
        editingVendor._id,
        formData,
        async () => {
          const response = await fetch(`/api/users/${editingVendor._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          })
          if (!response.ok) throw new Error('Update failed')
          return response.json()
        }
      )
    } else {
      const tempVendor: Vendor = {
        _id: `temp-${Date.now()}`,
        ...formData,
        role: 'vendor',
        status: formData.status as 'active' | 'inactive',
        createdAt: new Date().toISOString()
      }
      
      await optimisticAdd(
        tempVendor,
        async () => {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, role: 'vendor' })
          })
          if (!response.ok) throw new Error('Creation failed')
          const data = await response.json()
          return data.user
        }
      )
    }
    
    setShowModal(false)
    setEditingVendor(null)
    resetForm()
  }

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setFormData({
      name: vendor.name,
      companyName: vendor.companyName || '',
      phone: vendor.phone,
      email: vendor.email,
      password: '',
      role: 'vendor',
      address: '',
      bankDetails: '',
      status: vendor.status
    })
    setShowModal(true)
  }

  const handleDelete = async (vendor: Vendor) => {
    if (window.confirm(`${t('confirmDelete')} ${vendor.name}? ${t('actionCannotBeUndone')}`)) {
      await optimisticDelete(
        vendor._id,
        async () => {
          const response = await fetch(`/api/users/${vendor._id}`, { method: 'DELETE' })
          if (!response.ok) throw new Error('Delete failed')
        }
      )
    }
  }

  const resetForm = () => {
    setFormData({ name: '', companyName: '', phone: '', email: '', password: '', role: 'vendor', address: '', bankDetails: '', status: 'active' })
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
    <ErrorBoundary>
      <div>
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Store className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-text dark:text-text-dark">Vendor Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {vendors.length} vendors · {activeCount} active
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 sm:mt-0">
            <LoadingButton
              onClick={() => { resetForm(); setShowModal(true) }}
              loading={optimisticLoading}
              className="dubai-button inline-flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </LoadingButton>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, company, or email..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="form-select w-auto"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Vendors Table */}
        <div className="mt-6">
          {loading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : filteredVendors.length === 0 ? (
            <EmptyState
              icon={<Store className="h-12 w-12" />}
              title={searchTerm ? 'No vendors found' : 'No vendors yet'}
              description={searchTerm 
                ? 'Try adjusting your search or filters'
                : 'Vendors are merchants and service providers who receive payments and settlements.'
              }
              action={!searchTerm ? (
                <LoadingButton onClick={() => setShowModal(true)} className="dubai-button">
                  <Plus className="h-4 w-4 mr-2" /> Add Vendor
                </LoadingButton>
              ) : undefined}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-hidden shadow ring-1 ring-black/5 dark:ring-gray-600 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="table-header">
                    <tr>
                      <th className="table-cell font-medium text-xs uppercase tracking-wider">Vendor</th>
                      <th className="table-cell font-medium text-xs uppercase tracking-wider">Company</th>
                      <th className="table-cell font-medium text-xs uppercase tracking-wider">Contact</th>
                      <th className="table-cell font-medium text-xs uppercase tracking-wider">Status</th>
                      <th className="table-cell font-medium text-xs uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredVendors.map((vendor) => (
                      <tr key={vendor._id} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xs font-semibold text-purple-700 dark:text-purple-300">
                              {vendor.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="font-medium">{vendor.name}</span>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                            {vendor.companyName || '—'}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {vendor.phone || '—'}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <Mail className="h-3 w-3" />
                              {vendor.email}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                            vendor.status === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          }`}>
                            {vendor.status}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center justify-end space-x-1">
                            <button onClick={() => handleEdit(vendor)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" title="Edit">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(vendor)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredVendors.map((vendor) => (
                  <div key={vendor._id} className="dubai-card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-sm font-semibold text-purple-700 dark:text-purple-300">
                          {vendor.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-text dark:text-text-dark">{vendor.name}</p>
                          {vendor.companyName && <p className="text-xs text-gray-500 dark:text-gray-400">{vendor.companyName}</p>}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        vendor.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                      }`}>
                        {vendor.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {vendor.phone || '—'}</div>
                      <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {vendor.email}</div>
                    </div>
                    <div className="flex justify-end gap-1 pt-3 border-t border-border dark:border-border-dark">
                      <button onClick={() => handleEdit(vendor)} className="p-2 text-gray-500 hover:text-primary rounded-md" title="Edit"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(vendor)} className="p-2 text-gray-500 hover:text-red-600 rounded-md" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay flex items-start sm:items-center justify-center p-4">
            <div className="modal-content w-full max-w-lg">
              <h3 className="text-lg font-bold text-text dark:text-text-dark mb-1">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                {editingVendor ? 'Update vendor details' : 'Create a new vendor/merchant account'}
              </p>
              {optimisticLoading ? (
                <FormSkeleton fields={5} />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Vendor's full name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">Company Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Business / company name"
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">Phone *</label>
                      <input
                        type="tel"
                        required
                        className="form-input"
                        placeholder="+971-XX-XXX-XXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        className="form-input"
                        placeholder="vendor@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  {!editingVendor && (
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                        Password <span className="text-gray-400 font-normal">(leave blank to auto-generate)</span>
                      </label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Auto-generated if empty"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <LoadingButton
                      type="button"
                      onClick={() => { setShowModal(false); setEditingVendor(null); resetForm() }}
                      variant="secondary"
                    >
                      {t('cancel')}
                    </LoadingButton>
                    <LoadingButton type="submit" loading={optimisticLoading} variant="primary">
                      {editingVendor ? 'Update Vendor' : 'Create Vendor'}
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