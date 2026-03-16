'use client'
import { useState, useEffect } from 'react'
import {
  Shield, Users, Monitor, Activity,
  Edit, Trash2, Search, UserPlus,
  RefreshCw, Key, Clock, MapPin,
  Smartphone, AlertTriangle, Eye, EyeOff,
  UserCheck, UserX, Crown, ChevronRight
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/components/LanguageProvider'
import { RoleGuard } from '@/components/RoleGuard'
import { format } from 'date-fns'
import { ConfirmationModal } from '@/components/ConfirmationModal'

interface User {
  _id: string
  name: string
  email: string
  phone: string
  role: 'admin' | 'agent'
  companyName?: string
  status: 'active' | 'inactive'
  createdAt: string
}

interface SessionInfo {
  _id: string
  sessionId: string
  userId: { _id: string; name: string; email: string; role: string }
  loginTime: string
  logoutTime?: string
  ipAddress: string
  isActive: boolean
  deviceInfo: { browser: string; os: string; device: string }
}

interface UserStats {
  total: number
  admins: number
  agents: number
  active: number
  inactive: number
}

type TabType = 'overview' | 'users' | 'sessions'

export default function AdminPanel() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<'all' | 'admin' | 'agent'>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'agent' as 'admin' | 'agent',
    companyName: '',
    password: '',
  })
  const [showAdminConfirm, setShowAdminConfirm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [activeSessions, setActiveSessions] = useState(0)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)
  const [terminatingSession, setTerminatingSession] = useState<SessionInfo | null>(null)

  // Stats
  const [stats, setStats] = useState<UserStats>({ total: 0, admins: 0, agents: 0, active: 0, inactive: 0 })

  useEffect(() => {
    fetchUsers()
    fetchSessions()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, selectedRole, selectedStatus])

  useEffect(() => {
    const s: UserStats = { total: users.length, admins: 0, agents: 0, active: 0, inactive: 0 }
    users.forEach(u => {
      if (u.role === 'admin') s.admins++
      else if (u.role === 'agent') s.agents++
      if (u.status === 'active') s.active++
      else s.inactive++
    })
    setStats(s)
  }, [users])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await fetch('/api/users?includeAdmins=true')
      const data = await response.json()
      setUsers(data.users || [])
    } catch {
      toast.error('Failed to fetch users')
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true)
      const response = await fetch('/api/admin/sessions?active=true')
      const data = await response.json()
      setSessions(data.sessions || [])
      setActiveSessions(data.activeCount || 0)
    } catch {
      // Sessions may fail silently on first load
    } finally {
      setLoadingSessions(false)
    }
  }

  const filterUsers = () => {
    let filtered = users
    if (selectedRole !== 'all') filtered = filtered.filter(u => u.role === selectedRole)
    if (selectedStatus !== 'all') filtered = filtered.filter(u => u.status === selectedStatus)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.companyName?.toLowerCase().includes(term)
      )
    }
    setFilteredUsers(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingUser && formData.role === 'admin' && !showAdminConfirm) {
      setShowAdminConfirm(true)
      return
    }

    try {
      setSubmitting(true)
      const method = editingUser ? 'PUT' : 'POST'
      const url = editingUser ? `/api/users/${editingUser._id}` : '/api/users'

      const payload: any = { ...formData }
      if (editingUser && !payload.password) delete payload.password

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        if (editingUser) {
          toast.success('User updated successfully')
        } else {
          const msg = data.tempPassword
            ? `User created! Temporary password: ${data.tempPassword}`
            : 'User created successfully'
          toast.success(msg, { duration: 10000 })
        }
        setShowModal(false)
        resetForm()
        fetchUsers()
      } else {
        toast.error(data.error || 'Failed to save user')
      }
    } catch {
      toast.error('Failed to save user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      companyName: user.companyName || '',
      password: '',
    })
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    try {
      const response = await fetch(`/api/users/${deletingUser._id}`, { method: 'DELETE' })
      const data = await response.json()
      if (response.ok) {
        toast.success('User deleted successfully')
        setShowDeleteDialog(false)
        setDeletingUser(null)
        fetchUsers()
      } else {
        toast.error(data.error || 'Failed to delete user')
      }
    } catch {
      toast.error('Failed to delete user')
    }
  }

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    try {
      const response = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (response.ok) {
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
        fetchUsers()
      } else {
        toast.error('Failed to update status')
      }
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleResetPassword = async () => {
    if (!resetUser) return
    try {
      const response = await fetch(`/api/users/${resetUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: true })
      })
      const data = await response.json()
      if (response.ok) {
        toast.success(`New password: ${data.tempPassword}`, { duration: 15000 })
        setShowResetDialog(false)
        setResetUser(null)
      } else {
        toast.error(data.error || 'Failed to reset password')
      }
    } catch {
      toast.error('Failed to reset password')
    }
  }

  const handleTerminateSession = async () => {
    if (!terminatingSession) return
    try {
      const response = await fetch('/api/admin/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: terminatingSession.sessionId })
      })
      if (response.ok) {
        toast.success('Session terminated')
        setShowTerminateDialog(false)
        setTerminatingSession(null)
        fetchSessions()
      } else {
        toast.error('Failed to terminate session')
      }
    } catch {
      toast.error('Failed to terminate session')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', role: 'agent', companyName: '', password: '' })
    setEditingUser(null)
    setShowAdminConfirm(false)
    setShowPassword(false)
  }

  const getRoleBadge = (role: string) => {
    const classes: Record<string, string> = {
      admin: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      agent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    }
    return classes[role] || 'bg-gray-100 text-gray-800'
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Activity },
    { id: 'users' as TabType, label: 'User Management', icon: Users },
    { id: 'sessions' as TabType, label: 'Active Sessions', icon: Monitor },
  ]

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Panel</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">System administration & user management</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-1 overflow-x-auto -mb-px" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                  {tab.id === 'sessions' && activeSessions > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 rounded-full">
                      {activeSessions}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* ────────────────── OVERVIEW TAB ────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Users', value: stats.total, icon: Users, color: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-700' },
                { label: 'Admins', value: stats.admins, icon: Crown, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Agents', value: stats.agents, icon: UserCheck, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Active', value: stats.active, icon: UserCheck, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                { label: 'Sessions', value: activeSessions, icon: Monitor, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="dubai-card p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${stat.bg}`}>
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{loadingUsers ? '-' : stat.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => { resetForm(); setShowModal(true); setActiveTab('users') }}
                className="dubai-card p-5 text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
                      <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Create User</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Add admin or agent</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className="dubai-card p-5 text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Manage Users</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stats.total} total users</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>

              <button
                onClick={() => setActiveTab('sessions')}
                className="dubai-card p-5 text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg group-hover:scale-110 transition-transform">
                      <Monitor className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Active Sessions</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{activeSessions} live now</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            </div>

            {/* Recent Users + Active Sessions Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Registrations */}
              <div className="dubai-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">Recent Registrations</h3>
                  <button onClick={() => setActiveTab('users')} className="text-xs text-primary hover:underline">
                    View all
                  </button>
                </div>
                <div className="space-y-3">
                  {loadingUsers ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3 animate-pulse">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <div className="flex-1">
                          <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-1.5" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                        </div>
                      </div>
                    ))
                  ) : users.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No users yet</p>
                  ) : (
                    users.slice(0, 5).map((user) => (
                      <div key={user._id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${getRoleBadge(user.role)}`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadge(user.role)}`}>
                            {user.role}
                          </span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(user.createdAt), 'MMM dd')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Live Sessions Preview */}
              <div className="dubai-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">Live Sessions</h3>
                  <button onClick={() => setActiveTab('sessions')} className="text-xs text-primary hover:underline">
                    View all
                  </button>
                </div>
                <div className="space-y-3">
                  {loadingSessions ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3 animate-pulse">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <div className="flex-1">
                          <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-1.5" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                        </div>
                      </div>
                    ))
                  ) : sessions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No active sessions</p>
                  ) : (
                    sessions.slice(0, 5).map((session) => (
                      <div key={session._id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              session.userId?.role ? getRoleBadge(session.userId.role) : 'bg-gray-100 text-gray-600'
                            }`}>
                              {session.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {session.userId?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {session.deviceInfo?.browser} · {session.ipAddress}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {format(new Date(session.loginTime), 'HH:mm')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────── USERS TAB ────────────────── */}
        {activeTab === 'users' && (
          <div>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, company..."
                    className="form-input pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="form-select w-auto"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admins</option>
                  <option value="agent">Agents</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="form-select w-auto"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchUsers}
                  className="btn-secondary p-2"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { resetForm(); setShowModal(true) }}
                  className="dubai-button inline-flex items-center text-sm py-2 px-4"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </button>
              </div>
            </div>

            {/* Role stats bar */}
            <div className="flex items-center gap-2 mb-4 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Showing {filteredUsers.length} of {users.length} users
              </span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className={`px-2 py-0.5 rounded-full ${getRoleBadge('admin')}`}>{stats.admins} admins</span>
              <span className={`px-2 py-0.5 rounded-full ${getRoleBadge('agent')}`}>{stats.agents} agents</span>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block">
              <div className="overflow-hidden shadow ring-1 ring-black/5 dark:ring-gray-600 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="table-header">
                    <tr>
                      <th className="table-cell font-medium text-xs uppercase tracking-wider">User</th>
                      <th className="table-cell font-medium text-xs uppercase tracking-wider">Role</th>
                      <th className="table-cell font-medium text-xs uppercase tracking-wider">Company</th>
                      <th className="table-cell font-medium text-xs uppercase tracking-wider">Status</th>
                      <th className="table-cell font-medium text-xs uppercase tracking-wider">Joined</th>
                      <th className="table-cell font-medium text-xs uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loadingUsers ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="table-cell"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" /></td>
                          <td className="table-cell"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
                          <td className="table-cell"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" /></td>
                          <td className="table-cell"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
                          <td className="table-cell"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></td>
                          <td className="table-cell"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 ml-auto" /></td>
                        </tr>
                      ))
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                          <p className="font-medium">No users found</p>
                          <p className="text-sm mt-1">{searchTerm ? 'Try adjusting your filters' : 'Create your first user to get started'}</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user._id} className="table-row">
                          <td className="table-cell">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${getRoleBadge(user.role)}`}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                                  {user.name}
                                  {user.role === 'admin' && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="table-cell text-gray-500 dark:text-gray-400">{user.companyName || '—'}</td>
                          <td className="table-cell">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                                user.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60'
                              }`}
                              title={`Click to ${user.status === 'active' ? 'deactivate' : 'activate'}`}
                            >
                              {user.status === 'active' ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                              {user.status}
                            </button>
                          </td>
                          <td className="table-cell text-gray-500 dark:text-gray-400 text-sm">
                            {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleEdit(user)}
                                className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                title="Edit user"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { setResetUser(user); setShowResetDialog(true) }}
                                className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                title="Reset password"
                              >
                                <Key className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { setDeletingUser(user); setShowDeleteDialog(true) }}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {loadingUsers ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="dubai-card p-4 animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium text-gray-900 dark:text-white">No users found</p>
                  {!searchTerm && (
                    <button onClick={() => setShowModal(true)} className="dubai-button mt-3 text-sm py-2 px-4">
                      <UserPlus className="h-4 w-4 mr-2 inline" /> Add User
                    </button>
                  )}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user._id} className="dubai-card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${getRoleBadge(user.role)}`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                            {user.name}
                            {user.role === 'admin' && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-3">
                      <div className="text-gray-500 dark:text-gray-400">
                        {user.companyName && <span className="mr-3">{user.companyName}</span>}
                        <span>Joined {format(new Date(user.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        }`}
                      >
                        {user.status === 'active' ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {user.status}
                      </button>
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => handleEdit(user)} className="p-2 text-gray-500 hover:text-primary rounded-md" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setResetUser(user); setShowResetDialog(true) }} className="p-2 text-gray-500 hover:text-amber-600 rounded-md" title="Reset password">
                        <Key className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setDeletingUser(user); setShowDeleteDialog(true) }} className="p-2 text-gray-500 hover:text-red-600 rounded-md" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ────────────────── SESSIONS TAB ────────────────── */}
        {activeTab === 'sessions' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Active Sessions</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeSessions} active {activeSessions === 1 ? 'session' : 'sessions'} across all users
                </p>
              </div>
              <button onClick={fetchSessions} className="btn-secondary p-2" title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {loadingSessions ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="dubai-card p-4 animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-56" />
                      </div>
                    </div>
                  </div>
                ))
              ) : sessions.length === 0 ? (
                <div className="text-center py-16">
                  <Monitor className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium text-gray-900 dark:text-white">No active sessions</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">There are no users currently signed in</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session._id} className="dubai-card p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                            session.userId?.role ? getRoleBadge(session.userId.role) : 'bg-gray-100 text-gray-600'
                          }`}>
                            {session.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {session.userId?.name || 'Unknown User'}
                            </p>
                            {session.userId?.role && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadge(session.userId.role)}`}>
                                {session.userId.role}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {session.userId?.email || ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 sm:pl-0 pl-13">
                        <div className="flex items-center gap-1">
                          {session.deviceInfo?.device === 'Mobile'
                            ? <Smartphone className="h-3.5 w-3.5" />
                            : <Monitor className="h-3.5 w-3.5" />
                          }
                          <span>{session.deviceInfo?.browser} / {session.deviceInfo?.os}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{session.ipAddress}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{format(new Date(session.loginTime), 'MMM dd, HH:mm')}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setTerminatingSession(session)
                          setShowTerminateDialog(true)
                        }}
                        className="self-end sm:self-auto px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors"
                      >
                        Terminate
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ────────────────── CREATE/EDIT MODAL ────────────────── */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-8">
                {editingUser ? 'Update user details' : 'Add a new user to the system'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  <div>
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Enter full name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder="user@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={!!editingUser}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+971-XX-XXX-XXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={formData.role}
                      onChange={(e) => {
                        const role = e.target.value as any
                        setFormData({...formData, role})
                        setShowAdminConfirm(false)
                      }}
                    >
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Optional"
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    />
                  </div>
                </div>

                {formData.role === 'admin' && !editingUser && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-300">Creating an admin user</p>
                      <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                        This user will have full system access including user management, data access, and session control.
                      </p>
                    </div>
                  </div>
                )}

                {!editingUser && (
                  <div>
                    <label className="form-label">
                      Password <span className="text-gray-400 font-normal">(leave blank to auto-generate)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-input pr-10"
                        placeholder="Auto-generated if empty"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {editingUser && (
                  <div>
                    <label className="form-label">
                      New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-input pr-10"
                        placeholder="Leave blank to keep current"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Admin confirmation step */}
                {showAdminConfirm && !editingUser && formData.role === 'admin' && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      Confirm admin creation
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                      Click &quot;Create User&quot; again to confirm creating <strong>{formData.name || 'this user'}</strong> as an admin.
                    </p>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-5 border-t border-gray-200 dark:border-gray-700 mt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm() }}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="dubai-button w-full sm:w-auto"
                  >
                    {submitting ? 'Saving...' : editingUser ? 'Update User' : showAdminConfirm ? 'Confirm & Create' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ────────────────── DELETE DIALOG ────────────────── */}
        {showDeleteDialog && deletingUser && (
          <div className="modal-overlay flex items-center justify-center p-4">
            <div className="modal-content w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete User</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete <strong>{deletingUser.name}</strong> ({deletingUser.email})?
                This action cannot be undone.
              </p>
              {deletingUser.role === 'admin' && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-4 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-800 dark:text-amber-300">This user is an admin. Deleting them will revoke all their administrative privileges.</p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowDeleteDialog(false); setDeletingUser(null) }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────── RESET PASSWORD DIALOG ────────────────── */}
        {showResetDialog && resetUser && (
          <div className="modal-overlay flex items-center justify-center p-4">
            <div className="modal-content w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reset Password</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Generate a new temporary password for <strong>{resetUser.name}</strong> ({resetUser.email})?
                The current password will be invalidated.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowResetDialog(false); setResetUser(null) }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="dubai-button py-2 px-5 text-sm"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────── TERMINATE SESSION DIALOG ────────────────── */}
        <ConfirmationModal
          isOpen={showTerminateDialog}
          onClose={() => {
            setShowTerminateDialog(false)
            setTerminatingSession(null)
          }}
          onConfirm={handleTerminateSession}
          title="Terminate Session"
          message={`Are you sure you want to terminate the session for ${terminatingSession?.userId?.name || 'this user'}? They will be logged out immediately.`}
          confirmText="Terminate Session"
          type="terminate"
        />
      </div>
    </RoleGuard>
  )
}
