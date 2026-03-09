'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/components/LanguageProvider'
import { TableSkeleton, FormSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingButton } from '@/components/ui/loading-button'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useOptimistic } from '@/hooks/useOptimistic'

interface Vendor {
  _id: string
  name: string
  companyName: string
  phone: string
  email: string
  status: 'active' | 'inactive'
}

export default function Vendors() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
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

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        status: formData.status as 'active' | 'inactive'
      }
      
      await optimisticAdd(
        tempVendor,
        async () => {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          })
          if (!response.ok) throw new Error('Creation failed')
          const data = await response.json()
          return data.user
        }
      )
    }
    
    setShowModal(false)
    setEditingVendor(null)
    setFormData({ name: '', companyName: '', phone: '', email: '', password: '', role: 'vendor', address: '', bankDetails: '', status: 'active' })
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
    const confirmed = window.confirm(`Are you sure you want to delete ${vendor.name}? This action cannot be undone.`)
    if (confirmed) {
      await optimisticDelete(
        vendor._id,
        async () => {
          const response = await fetch(`/api/users/${vendor._id}`, {
            method: 'DELETE'
          })
          if (!response.ok) throw new Error('Delete failed')
        }
      )
    }
  }

  return (
    <ErrorBoundary>
      <div>
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-text dark:text-text-dark">Users</h1>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Manage vendors and agents</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <LoadingButton
              onClick={() => setShowModal(true)}
              loading={optimisticLoading}
              className="dubai-button inline-flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </LoadingButton>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchVendors')}
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Vendors Table */}
        <div className="mt-8 flex flex-col">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full py-2 align-middle">
              {loading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : filteredVendors.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title={searchTerm ? "No vendors found" : "No vendors yet"}
                  description={searchTerm ? 
                    "Try adjusting your search terms" : 
                    "Get started by adding your first vendor"
                  }
                  action={!searchTerm ? (
                    <LoadingButton
                      onClick={() => setShowModal(true)}
                      className="dubai-button"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </LoadingButton>
                  ) : undefined}
                />
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-600 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                    <thead className="table-header">
                      <tr>
                        <th className="table-cell font-medium uppercase tracking-wider">{t('name')}</th>
                        <th className="table-cell font-medium uppercase tracking-wider">{t('companyName')}</th>
                        <th className="table-cell font-medium uppercase tracking-wider">{t('contact')}</th>
                        <th className="table-cell font-medium uppercase tracking-wider">{t('status')}</th>
                        <th className="table-cell font-medium uppercase tracking-wider">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                      {filteredVendors.map((vendor) => (
                        <tr key={vendor._id} className="table-row hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="table-cell font-medium">{vendor.name}</td>
                          <td className="table-cell">{vendor.companyName || '-'}</td>
                          <td className="table-cell">
                            <div>{vendor.phone}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{vendor.email}</div>
                          </td>
                          <td className="table-cell">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              vendor.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {t(vendor.status)}
                            </span>
                          </td>
                          <td className="table-cell">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(vendor)}
                                className="text-primary hover:text-accent transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                                title={t('edit')}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(vendor)}
                                className="text-danger hover:text-red-700 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
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

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="text-lg font-bold text-text dark:text-text-dark mb-4">
                {editingVendor ? 'Edit User' : 'Add User'}
              </h3>
              {optimisticLoading ? (
                <FormSkeleton fields={5} />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    placeholder={t('name')}
                    required
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder={t('companyName')}
                    className="form-input"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  />
                  <input
                    type="tel"
                    placeholder={t('phoneNumber')}
                    required
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                  <input
                    type="email"
                    placeholder={t('email')}
                    required
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    required={!editingVendor}
                    className="form-input"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <select
                    className="form-select"
                    value={formData.role || 'vendor'}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="vendor">{t('vendor')}</option>
                    <option value="agent">{t('agent')}</option>
                  </select>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                  >
                    <option value="active">{t('active')}</option>
                    <option value="inactive">{t('inactive')}</option>
                  </select>
                  <div className="flex justify-end space-x-2">
                    <LoadingButton
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingVendor(null)
                        setFormData({ name: '', companyName: '', phone: '', email: '', password: '', role: 'vendor', address: '', bankDetails: '', status: 'active' })
                      }}
                      variant="secondary"
                    >
                      {t('cancel')}
                    </LoadingButton>
                    <LoadingButton
                      type="submit"
                      loading={optimisticLoading}
                      variant="primary"
                    >
                      {editingVendor ? 'Update User' : 'Add User'}
                    </LoadingButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}