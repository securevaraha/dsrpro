'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Tag, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { RoleGuard } from '@/components/RoleGuard'
import { TableSkeleton } from '@/components/ui/skeleton'

interface Brand {
  _id: string
  name: string
  description: string
  isActive: boolean
  createdBy?: { name: string }
  updatedBy?: { name: string }
  createdAt: string
  updatedAt: string
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/brands')
      if (response.ok) {
        const data = await response.json()
        setBrands(data.brands || [])
      } else {
        toast.error('Failed to load brands')
      }
    } catch {
      toast.error('Failed to load brands')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Brand name is required')
      return
    }
    setSubmitting(true)
    try {
      const url = editingBrand ? `/api/brands/${editingBrand._id}` : '/api/brands'
      const method = editingBrand ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        toast.success(editingBrand ? 'Brand updated' : 'Brand created')
        setShowModal(false)
        setEditingBrand(null)
        setFormData({ name: '', description: '' })
        fetchBrands()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to save brand')
      }
    } catch {
      toast.error('Failed to save brand')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingBrand) return
    try {
      const response = await fetch(`/api/brands/${deletingBrand._id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Brand deleted')
        setShowDeleteDialog(false)
        setDeletingBrand(null)
        fetchBrands()
      } else {
        toast.error('Failed to delete brand')
      }
    } catch {
      toast.error('Failed to delete brand')
    }
  }

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Tag className="h-6 w-6 text-primary" />
              Brands
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage POS machine brands</p>
          </div>
          <button
            onClick={() => { setEditingBrand(null); setFormData({ name: '', description: '' }); setShowModal(true) }}
            className="dubai-button inline-flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Brand
          </button>
        </div>

        {/* Search */}
        <div className="mt-5 relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search brands..."
            className="form-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="mt-6">
          {loading ? (
            <TableSkeleton rows={4} columns={5} />
          ) : filteredBrands.length === 0 ? (
            <div className="dubai-card text-center py-12">
              <Tag className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                {searchTerm ? 'No brands found' : 'No brands yet'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm ? 'Try a different search term' : 'Create your first brand'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto dubai-card !p-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created By</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created Date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Updated Date</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filteredBrands.map((brand) => (
                    <tr key={brand._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {brand.name}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                        {brand.description || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                        {brand.createdBy?.name || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {format(new Date(brand.createdAt), 'dd-MMM-yyyy')}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {format(new Date(brand.updatedAt), 'dd-MMM-yyyy')}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingBrand(brand)
                              setFormData({ name: brand.name, description: brand.description || '' })
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

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingBrand ? 'Edit Brand' : 'Add Brand'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Brand name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Optional description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingBrand(null) }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="dubai-button">
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Brand</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete <strong>{deletingBrand.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDeleteDialog(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleDelete} className="btn-danger">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
