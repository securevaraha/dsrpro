'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Calculator,
  Shield,
  Wifi,
  Layers,
  Tag,
  Moon,
  Sun,
  ChevronRight,
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

interface NavItem {
  name: string
  href: string
  icon: any
  roles: UserRole[]
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

// Mobile bottom nav — most-used items only
const mobileNav: NavItem[] = [
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'agent'] },
  { name: 'POS Machines', href: '/dashboard/pos-machines', icon: Wifi, roles: ['admin', 'agent'] },
  { name: 'receipts', href: '/dashboard/receipts', icon: Receipt, roles: ['admin', 'agent'] },
  { name: 'payments', href: '/dashboard/payments', icon: CreditCard, roles: ['admin'] },
  { name: 'reports', href: '/dashboard/reports', icon: FileText, roles: ['admin', 'agent'] },
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

  const filteredNav = navigation.filter(item => item.roles.includes(userRole))
  const filteredMobileNav = mobileNav.filter(item => item.roles.includes(userRole))

  // Derive current page label for header
  const currentPage = navigation.find(n => n.href === pathname)
  const pageTitle = currentPage ? t(currentPage.name) : 'DSR Pro'

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      router.push('/auth/signin')
    }
  }

  const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    const Icon = item.icon
    const isActive = pathname === item.href
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
      >
        <Icon className={`mr-3 h-[18px] w-[18px] flex-shrink-0 ${isActive ? 'text-primary' : 'opacity-60 group-hover:opacity-100'}`} />
        <span className="truncate">{t(item.name)}</span>
        {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary/60 flex-shrink-0" />}
      </Link>
    )
  }

  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5 flex-shrink-0">
        <div className="w-9 h-9 bg-dubai-gradient rounded-xl flex items-center justify-center shadow-dubai flex-shrink-0">
          <span className="text-white font-bold text-sm font-display">د</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none">DSR Pro</h1>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">POS & ERP System</p>
        </div>
      </div>

      {/* User pill */}
      {user && (
        <div className="mx-3 mb-4 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${userRole === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-none">{userName}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize mt-0.5">{userRole}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => (
          <NavLink key={item.href} item={item} onClick={onNavClick} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 border-t border-gray-100 dark:border-white/[0.06] p-3 space-y-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-150"
        >
          <LogOut className="mr-3 h-[18px] w-[18px] opacity-70" />
          {t('signOut')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col max-w-[280px] w-full h-full bg-white dark:bg-gray-800 shadow-2xl border-r border-gray-200 dark:border-gray-700/60 animate-in slide-in-from-left duration-200">
            <button
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-[260px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700/60">
          <SidebarContent />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">

        {/* Header */}
        <header className="sticky top-0 z-10 h-14 sm:h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700/60 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              className="md:hidden -ml-1 h-9 w-9 inline-flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate capitalize">
                {pageTitle}
              </h2>
              <p className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 truncate">
                DSR Pro · {userRole === 'admin' ? 'Administrator' : 'Agent'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div className="hidden sm:block">
              <LanguageDropdown />
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light'
                ? <Moon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                : <Sun className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              }
            </button>
            <div className="hidden sm:block">
              <NotificationDropdown />
            </div>
            <UserProfileDropdown userRole={userRole} userName={userName} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50 dark:bg-gray-900">
          <div className="p-4 sm:p-5 md:p-6 pb-20 md:pb-6 min-h-full">
            {children}
          </div>
          <footer className="border-t border-gray-200 dark:border-gray-700/60 px-4 sm:px-6 py-3">
            <div className="text-center text-xs text-gray-400 dark:text-gray-500">
              {t('copyright')}
            </div>
          </footer>
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700/60 flex items-center justify-around px-2 py-1 safe-area-inset-bottom">
        {filteredMobileNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-150 min-w-0 ${
                isActive
                  ? 'text-primary'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
              <span className="text-[10px] font-medium truncate max-w-[52px] capitalize">
                {t(item.name)}
              </span>
              {isActive && <div className="w-1 h-1 rounded-full bg-primary" />}
            </Link>
          )
        })}
      </nav>

      <SessionWarningModal
        isOpen={showWarning}
        onExtend={extendSession}
        onLogout={logout}
      />
    </div>
  )
}
