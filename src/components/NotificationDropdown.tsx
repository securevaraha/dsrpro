'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, Check, X, UserCheck, UserX, Loader2 } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface Notification {
  _id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  createdAt: string
  actionType?: 'none' | 'account_approval'
  actionTaken?: 'pending' | 'approved' | 'rejected'
  actionData?: {
    targetUserId: string
    targetRole: string
    targetName: string
    targetEmail: string
  }
}

export default function NotificationDropdown() {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })
      fetchNotifications()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      })
      fetchNotifications()
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const handleAction = async (notificationId: string, action: 'approved' | 'rejected') => {
    setActionLoading(`${notificationId}-${action}`)
    try {
      const res = await fetch('/api/notifications/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, action })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        fetchNotifications()
      } else {
        toast.error(data.error || 'Action failed')
      }
    } catch (error) {
      toast.error('Failed to process action')
    } finally {
      setActionLoading(null)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 dark:text-green-400'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400'
      case 'error': return 'text-red-600 dark:text-red-400'
      default: return 'text-blue-600 dark:text-blue-400'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-primary hover:text-accent transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className={`text-sm font-medium ${getTypeColor(notification.type)} truncate`}>
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {notification.message}
                      </p>

                      {/* Action buttons for account approval */}
                      {notification.actionType === 'account_approval' && (
                        <div className="mt-2.5">
                          {notification.actionTaken === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAction(notification._id, 'approved')}
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === `${notification._id}-approved` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserCheck className="h-3 w-3" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(notification._id, 'rejected')}
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === `${notification._id}-rejected` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserX className="h-3 w-3" />
                                )}
                                Reject
                              </button>
                              {notification.actionData?.targetRole && (
                                <span className={`ml-auto text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                  notification.actionData.targetRole === 'agent' 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                }`}>
                                  {notification.actionData.targetRole}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
                              notification.actionTaken === 'approved'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {notification.actionTaken === 'approved' ? (
                                <><UserCheck className="h-3 w-3" /> Approved</>
                              ) : (
                                <><UserX className="h-3 w-3" /> Rejected</>
                              )}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                    {!notification.isRead && notification.actionType !== 'account_approval' && (
                      <button
                        onClick={() => markAsRead(notification._id)}
                        className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
