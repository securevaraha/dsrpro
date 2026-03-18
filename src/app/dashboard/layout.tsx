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
  Shield,
  Wifi,
  Layers,
  Tag
} from 'lucide-react'
import { useSessionManager } from '@/hooks/useSessionManager'
import { SessionWarningModal } from '@/components/SessionWarningModal'
import { useCurrentUser, UserRole } from '@/hooks/useCurrentUser'
import { CurrentUserProvider } from '@/components/CurrentUserProvider'
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
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'agent'] },
  { name: 'Admin Panel', href: '/dashboard/admin', icon: Shield, roles: ['admin'] },
  { name: 'Segment', href: '/dashboard/segment', icon: Layers, roles: ['admin'] },
  { name: 'Brand', href: '/dashboard/brand', icon: Tag, roles: ['admin'] },
  { name: 'POS Machines', href: '/dashboard/pos-machines', icon: Wifi, roles: ['admin', 'agent'] },
  { name: 'receipts', href: '/dashboard/receipts', icon: Receipt, roles: ['admin', 'agent'] },
  { name: 'payments', href: '/dashboard/payments', icon: CreditCard, roles: ['admin'] },
  { name: 'settlements', href: '/dashboard/settlements', icon: Calculator, roles: ['admin'] },
  { name: 'reports', href: '/dashboard/reports', icon: FileText, roles: ['admin', 'agent'] },
  { name: 'settings', href: '/dashboard/settings', icon: Settings, roles: ['admin', 'agent'] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrentUserProvider>
      <DashboardShell>{children}</DashboardShell>
    </CurrentUserProvider>
  )
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const { user } = useCurrentUser()
  const { showWarning, extendSession, logout } = useSessionManager()

  const userRole: UserRole = user?.role || 'agent'
  const userName = user?.name || ''

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
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-[280px] w-full bg-white dark:bg-gray-800 shadow-2xl border-r border-gray-200 dark:border-gray-700/60">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none bg-black/20 hover:bg-black/40 dark:bg-transparent"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-6 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-5">
              <div className="w-9 h-9 bg-dubai-gradient rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <span className="text-white font-bold text-sm">DSR</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">DSR Info</h1>
            </div>
            <nav className="mt-8 px-3 space-y-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`mr-3 h-[18px] w-[18px] ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`} />
                    {t(item.name)}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0 border-r border-gray-200 dark:border-gray-700/60">
        <div className="flex flex-col w-[260px]">
          <div className="flex flex-col h-full bg-white dark:bg-gray-800">
            <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-5">
                <div className="w-9 h-9 bg-dubai-gradient rounded-xl flex items-center justify-center mr-3 shadow-sm">
                  <span className="text-white font-bold text-sm">DSR</span>
                </div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">DSR Info</h1>
              </div>
              <nav className="mt-8 flex-1 px-3 space-y-1">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`mr-3 h-[18px] w-[18px] ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`} />
                      {t(item.name)}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-white/[0.06] p-3">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all duration-150"
              >
                <LogOut className="mr-3 h-[18px] w-[18px] opacity-70" />
                {t('signOut')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 h-14 sm:h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700/60 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center min-w-0 flex-1">
            <button
              className="md:hidden -ml-1 h-9 w-9 inline-flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white ml-2 md:ml-0 truncate">
              DSR Info
            </h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className="hidden sm:block">
              <LanguageDropdown />
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {theme === 'light' ? 
                <Moon className="h-4 w-4 text-gray-600 dark:text-gray-300" /> : 
                <Sun className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              }
            </button>
            
            <div className="hidden sm:block">
              <NotificationDropdown />
            </div>
            
            <UserProfileDropdown userRole={userRole} userName={userName} />
          </div>
        </div>
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50 dark:bg-gray-900">
          <div className="p-4 sm:p-5 md:p-6 min-h-full">
            {children}
          </div>
          
          {/* Footer inside scroll area */}
          <footer className="border-t border-gray-200 dark:border-gray-700/60 px-4 sm:px-6 py-3">
            <div className="text-center text-xs text-gray-400 dark:text-gray-500">
              {t('copyright')}
            </div>
          </footer>
        </main>
      </div>
      
      {/* Session Warning Modal */}
      <SessionWarningModal
        isOpen={showWarning}
        onExtend={extendSession}
        onLogout={logout}
      />
    </div>
  )
}