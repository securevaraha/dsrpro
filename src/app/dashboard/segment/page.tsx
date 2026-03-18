'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Layers, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { RoleGuard } from '@/components/RoleGuard'
import { TableSkeleton } from '@/components/ui/skeleton'

interface Segment {
  _id: string
  name: string
  description: string
  isActive: boolean
  createdBy?: { name: string }
  updatedBy?: { name: string }
  createdAt: string
  updatedAt: string
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)
  const [deletingSegment, setDeletingSegment] = useState<Segment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    fetchSegments()
  }, [])

  const fetchSegments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/segments')
      if (response.ok) {
        const data = await response.json()
        setSegments(data.segments || [])
      } else {
        toast.error('Failed to load segments')
      }
    } catch {
      toast.error('Failed to load segments')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Segment name is required')
      return
    }
    setSubmitting(true)
    try {
      const url = editingSegment ? `/api/segments/${editingSegment._id}` : '/api/segments'
      const method = editingSegment ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        toast.success(editingSegment ? 'Segment updated' : 'Segment created')
        setShowModal(false)
        setEditingSegment(null)
        setFormData({ name: '', description: '' })
        fetchSegments()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to save segment')
      }
    } catch {
      toast.error('Failed to save segment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingSegment) return
    try {
      const response = await fetch(`/api/segments/${deletingSegment._id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Segment deleted')
        setShowDeleteDialog(false)
        setDeletingSegment(null)
        fetchSegments()
      } else {
        toast.error('Failed to delete segment')
      }
    } catch {
      toast.error('Failed to delete segment')
    }
  }

  const filteredSegments = segments.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Segments
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage POS machine segments</p>
          </div>
          <button
            onClick={() => { setEditingSegment(null); setFormData({ name: '', description: '' }); setShowModal(true) }}
            className="dubai-button inline-flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Segment
          </button>
        </div>

        {/* Search */}
        <div className="mt-5 relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search segments..."
            className="form-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="mt-6">
          {loading ? (
            <TableSkeleton rows={4} columns={5} />
          ) : filteredSegments.length === 0 ? (
            <div className="dubai-card text-center py-12">
              <Layers className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                {searchTerm ? 'No segments found' : 'No segments yet'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm ? 'Try a different search term' : 'Create your first segment'}
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
                  {filteredSegments.map((segment) => (
                    <tr key={segment._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {segment.name}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">
                        {segment.description || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                        {segment.createdBy?.name || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {format(new Date(segment.createdAt), 'dd-MMM-yyyy')}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {format(new Date(segment.updatedAt), 'dd-MMM-yyyy')}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingSegment(segment)
                              setFormData({ name: segment.name, description: segment.description || '' })
                              setShowModal(true)
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setDeletingSegment(segment); setShowDeleteDialog(true) }}
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
                {editingSegment ? 'Edit Segment' : 'Add Segment'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Segment name"
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
                    onClick={() => { setShowModal(false); setEditingSegment(null) }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="dubai-button">
                    {submitting ? 'Saving...' : (editingSegment ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteDialog && deletingSegment && (
          <div className="modal-overlay">
            <div className="modal-content max-w-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Segment</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete <strong>{deletingSegment.name}</strong>? This action cannot be undone.
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
