'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  CreditCard, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  User,
  Calculator,
  Shield
} from 'lucide-react'
import { useSessionManager } from '@/hooks/useSessionManager'
import { useCurrentUser, UserRole } from '@/hooks/useCurrentUser'
import LanguageDropdown from '@/components/LanguageDropdown'
import NotificationDropdown from '@/components/NotificationDropdown'
import UserProfileDropdown from '@/components/UserProfileDropdown'
import { useTheme } from '@/components/ThemeProvider'
import { useLanguage } from '@/components/LanguageProvider'
import { Moon, Sun } from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: any
  roles: UserRole[]  // which roles can see this nav item
}

const navigation: NavItem[] = [
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'agent', 'vendor'] },
  { name: 'Admin Panel', href: '/dashboard/admin', icon: Shield, roles: ['admin'] },
  { name: 'vendors', href: '/dashboard/vendors', icon: Users, roles: ['admin'] },
  { name: 'receipts', href: '/dashboard/receipts', icon: Receipt, roles: ['admin', 'agent'] },
  { name: 'payments', href: '/dashboard/payments', icon: CreditCard, roles: ['admin', 'agent'] },
  { name: 'settlements', href: '/dashboard/settlements', icon: Calculator, roles: ['admin', 'vendor'] },
  { name: 'reports', href: '/dashboard/reports', icon: FileText, roles: ['admin', 'agent', 'vendor'] },
  { name: 'settings', href: '/dashboard/settings', icon: Settings, roles: ['admin', 'agent', 'vendor'] },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const { user } = useCurrentUser()
  useSessionManager()

  const userRole: UserRole = user?.role || 'agent'
  const userName = user?.name || ''

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole))

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

  return (
    <div className="h-screen flex overflow-hidden bg-background dark:bg-background-dark">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-sidebar">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-6 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-6">
              <div className="w-8 h-8 bg-dubai-gradient rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-xs">DSR</span>
              </div>
              <h1 className="text-xl font-bold text-white">DSR Pro</h1>
            </div>
            <nav className="mt-8 px-3 space-y-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-3 py-3 text-sm font-medium rounded-card transition-colors ${
                      pathname === item.href
                        ? 'bg-primary text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {t(item.name)}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-65">
          <div className="flex flex-col h-0 flex-1 bg-sidebar">
            <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-6">
                <div className="w-8 h-8 bg-dubai-gradient rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-xs">DSR</span>
                </div>
                <h1 className="text-xl font-bold text-white">DSR Pro</h1>
              </div>
              <nav className="mt-8 flex-1 px-3 space-y-1">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 py-3 text-sm font-medium rounded-card transition-colors ${
                        pathname === item.href
                          ? 'bg-primary text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {t(item.name)}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 border-t border-gray-800 p-4">
              <button 
                onClick={handleLogout}
                className="flex-shrink-0 w-full group block"
              >
                <div className="flex items-center px-3 py-3 text-sm font-medium text-gray-300 hover:text-white rounded-card hover:bg-gray-800 transition-colors">
                  <LogOut className="mr-3 h-5 w-5" />
                  {t('signOut')}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden bg-background dark:bg-background-dark">
        {/* Header */}
        <div className="sticky top-0 z-10 h-14 sm:h-16 bg-white dark:bg-gray-800 border-b border-border dark:border-border-dark flex items-center justify-between px-3 sm:px-6 shadow-sm">
          <div className="flex items-center min-w-0 flex-1">
            <button
              className="md:hidden -ml-0.5 -mt-0.5 h-10 w-10 inline-flex items-center justify-center rounded-card text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base sm:text-lg md:text-xl font-semibold text-text dark:text-text-dark ml-2 md:ml-0 truncate">
              DSR Pro
            </h1>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-shrink-0">
            <div className="hidden sm:block">
              <LanguageDropdown />
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-card bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {theme === 'light' ? 
                <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" /> : 
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
              }
            </button>
            
            <div className="hidden sm:block">
              <NotificationDropdown />
            </div>
            
            <UserProfileDropdown userRole={userRole} userName={userName} />
          </div>
        </div>
        
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none bg-background dark:bg-background-dark">
          <div className="p-3 sm:p-4 md:p-6 min-h-full bg-background dark:bg-background-dark">
            {children}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="sticky bottom-0 z-10 bg-white dark:bg-gray-800 border-t border-border dark:border-border-dark px-3 sm:px-6 py-2 sm:py-4 shadow-sm">
          <div className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {t('copyright')}
          </div>
        </footer>
      </div>
    </div>
  )
}