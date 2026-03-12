'use client'
import { useState, useEffect, useRef } from 'react'
import { User, Settings, LogOut, Shield, ChevronDown, X } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { useRouter } from 'next/navigation'

interface UserProfileDropdownProps {
  userRole?: string
  userName?: string
}

export default function UserProfileDropdown({ userRole = 'admin', userName = 'Admin User' }: UserProfileDropdownProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      router.push('/auth/signin')
    } catch (error) {
      console.error('Logout error:', error)
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      router.push('/auth/signin')
    }
  }

  const adminOptions = [
    { label: 'User Management', href: '/dashboard/admin', icon: User },
    { label: 'System Settings', href: '/dashboard/settings', icon: Settings },
    { label: 'Reports & Analytics', href: '/dashboard/reports', icon: Shield },
  ]

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:block">{userName}</span>
          <ChevronDown className="h-3 w-3" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{userName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userRole}</p>
            </div>
            
            <div className="py-1">
              {userRole === 'admin' && (
                <button
                  onClick={() => {
                    setShowAdminModal(true)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Shield className="h-4 w-4 mr-3" />
                  Admin Panel
                </button>
              )}
              
              <button
                onClick={() => {
                  router.push('/dashboard/settings')
                  setIsOpen(false)
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="h-4 w-4 mr-3" />
                {t('settings')}
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-3" />
                {t('signOut')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Admin Panel</h3>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-2">
                {adminOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.href}
                      onClick={() => {
                        router.push(option.href)
                        setShowAdminModal(false)
                      }}
                      className="w-full flex items-center px-4 py-3 text-left text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    >
                      <Icon className="h-5 w-5 mr-3 text-primary" />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
