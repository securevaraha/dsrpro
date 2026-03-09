'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, UserPlus } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/components/LanguageProvider'

interface User {
  _id: string
  name: string
  email: string
  phone: string
  role: 'agent' | 'vendor'
  companyName?: string
  status: 'active' | 'inactive'
  createdAt: string
}

export default function AdminUsers() {
  const { t } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<'all' | 'agent' | 'vendor'>('all')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'agent' as 'agent' | 'vendor',
    companyName: '',
    address: '',
    bankDetails: ''
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, selectedRole])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const filterUsers = () => {
    let filtered = users
    
    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole)
    }
    
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    setFilteredUsers(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const method = editingUser ? 'PUT' : 'POST'
      const url = editingUser ? `/api/users/${editingUser._id}` : '/api/users'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(editingUser ? 'User updated successfully' : `User created successfully. ${data.tempPassword ? `Temp password: ${data.tempPassword}` : ''}`)
        setShowModal(false)
        resetForm()
        fetchUsers()
      } else {
        toast.error(data.error || 'Failed to save user')
      }
    } catch (error) {
      toast.error('Failed to save user')
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      companyName: user.companyName || '',
      address: '',
      bankDetails: ''
    })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    
    try {
      const response = await fetch(`/api/users/${deletingUser._id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('User deleted successfully')
        setShowDeleteDialog(false)
        setDeletingUser(null)
        fetchUsers()
      } else {
        throw new Error('Failed to delete user')
      }
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', role: 'agent', companyName: '', address: '', bankDetails: '' })
    setEditingUser(null)
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-text dark:text-text-dark">User Management</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Manage agents and vendors</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowModal(true)}
            className="dubai-button inline-flex items-center justify-center"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            className="form-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as any)}
          className="form-select"
        >
          <option value="all">All Roles</option>
          <option value="agent">Agents</option>
          <option value="vendor">Vendors</option>
        </select>
      </div>

      {/* Users Table - Desktop */}
      <div className="mt-8 hidden md:block">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-600 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                <thead className="table-header">
                  <tr>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('name')}</th>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('email')}</th>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('role')}</th>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('companyName')}</th>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('status')}</th>
                    <th className="table-cell font-medium uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="table-row">
                      <td className="table-cell font-medium">{user.name}</td>
                      <td className="table-cell">{user.email}</td>
                      <td className="table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'agent' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="table-cell">{user.companyName || '-'}</td>
                      <td className="table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {t(user.status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEdit(user)}
                            className="text-primary hover:text-accent transition-colors" 
                            title={t('edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setDeletingUser(user)
                              setShowDeleteDialog(true)
                            }}
                            className="text-danger hover:text-red-700 transition-colors" 
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
          </div>
        </div>
      </div>

      {/* Users Cards - Mobile */}
      <div className="mt-8 md:hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text dark:text-text-dark mb-2">No users found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first user'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowModal(true)}
                className="dubai-button"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user._id} className="dubai-card p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-text dark:text-text-dark">{user.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'agent' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}>
                      {user.role}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {t(user.status)}
                    </span>
                  </div>
                </div>
                
                {user.companyName && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('companyName')}</p>
                    <p className="text-sm text-text dark:text-text-dark">{user.companyName}</p>
                  </div>
                )}
                
                <div className="mb-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                  <p className="text-sm text-text dark:text-text-dark">{user.phone}</p>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-border dark:border-border-dark">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Created: {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEdit(user)}
                      className="text-primary hover:text-accent transition-colors p-2" 
                      title={t('edit')}
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => {
                        setDeletingUser(user)
                        setShowDeleteDialog(true)
                      }}
                      className="text-danger hover:text-red-700 transition-colors p-2" 
                      title={t('delete')}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-lg font-bold text-text dark:text-text-dark mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
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
                type="email"
                placeholder={t('email')}
                required
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              <input
                type="tel"
                placeholder={t('phoneNumber')}
                required
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as any})}
              >
                <option value="agent">Agent</option>
                <option value="vendor">Vendor</option>
              </select>
              <input
                type="text"
                placeholder={t('companyName')}
                className="form-input"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="btn-secondary"
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="dubai-button px-4 py-2 text-sm">
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-lg font-bold text-text dark:text-text-dark mb-4">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete user <strong>{deletingUser?.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeletingUser(null)
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-card hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}