'use client'
import { useEffect, useState, useRef } from 'react'
import {
  TrendingUp, TrendingDown, Users, Calculator, CreditCard,
  FileText, Briefcase, ShieldCheck, ArrowRight, Wifi,
  Activity, Calendar, Clock, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/components/LanguageProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import Chart from '@/components/Chart'
import { ChartSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

type Period = 'today' | 'week' | 'month' | 'year'

interface DashboardStats {
  totalReceipts: number
  totalPayments: number
  totalMargin: number
  totalBankCharges: number
  totalVAT: number
  activeAgents: number
  totalPOSMachines: number
  totalTransactions: number
  monthlyTrend?: { labels: string[]; data: number[] }
  transactionStatus?: { completed: number; pending: number; failed: number }
}

interface RecentTransaction {
  _id: string
  transactionId: string
  amount: number
  status: string
  agentId: { name: string }
  clientId: { name: string }
  createdAt: string
}

const PERIOD_KEY = 'dashboard_period'

function getPeriodLabel(period: Period): string {
  const now = new Date()
  switch (period) {
    case 'today':
      return format(now, 'EEEE, MMMM d, yyyy')
    case 'week': {
      const start = startOfWeek(now, { weekStartsOn: 1 })
      const end = endOfWeek(now, { weekStartsOn: 1 })
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    }
    case 'month':
      return format(now, 'MMMM yyyy')
    case 'year':
      return String(now.getFullYear())
  }
}

function formatAED(value: number): string {
  if (value >= 1_000_000_000) return `AED ${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(2)}M`
  return `AED ${value.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('today')
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [periodLabel, setPeriodLabel] = useState('')
  const { t } = useLanguage()
  const { user } = useCurrentUser()
  const role = user?.role || 'agent'
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore period from localStorage + init clock after mount
  useEffect(() => {
    const saved = (localStorage.getItem(PERIOD_KEY) as Period) || 'today'
    setPeriod(saved)
    setCurrentTime(new Date())
    clockRef.current = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => { if (clockRef.current) clearInterval(clockRef.current) }
  }, [])

  // Persist period selection
  useEffect(() => {
    localStorage.setItem(PERIOD_KEY, period)
    setPeriodLabel(getPeriodLabel(period))
    fetchDashboardData()
  }, [period])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsRes, transactionsRes] = await Promise.all([
        fetch(`/api/dashboard/stats?period=${period}`),
        fetch('/api/transactions?limit=5')
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
        setChartData({
          line: {
            labels: data.monthlyTrend?.labels || [],
            datasets: [{
              label: 'Revenue',
              data: data.monthlyTrend?.data || [],
              borderColor: '#D4AF37',
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
            }]
          },
          doughnut: {
            labels: ['Completed', 'Pending', 'Failed'],
            datasets: [{
              data: [
                data.transactionStatus?.completed || 0,
                data.transactionStatus?.pending || 0,
                data.transactionStatus?.failed || 0
              ],
              backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
              borderWidth: 0,
            }]
          }
        })
      }

      if (transactionsRes.ok) {
        const txData = await transactionsRes.json()
        setRecentTransactions(txData.transactions || [])
      }
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const periodButtons: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
  ]

  const adminCards = stats ? [
    {
      label: `Receipts · ${periodButtons.find(p => p.key === period)?.label}`,
      value: formatAED(stats.totalReceipts),
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      href: '/dashboard/receipts',
    },
    {
      label: `Payments · ${periodButtons.find(p => p.key === period)?.label}`,
      value: formatAED(stats.totalPayments),
      icon: TrendingDown,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      href: '/dashboard/payments',
    },
    {
      label: `Margin · ${periodButtons.find(p => p.key === period)?.label}`,
      value: formatAED(stats.totalMargin),
      icon: Calculator,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      href: '/dashboard/settlements',
    },
    {
      label: `Bank Charges · ${periodButtons.find(p => p.key === period)?.label}`,
      value: formatAED(stats.totalBankCharges),
      icon: CreditCard,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      href: '/dashboard/payments',
    },
    {
      label: `VAT · ${periodButtons.find(p => p.key === period)?.label}`,
      value: formatAED(stats.totalVAT),
      icon: FileText,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      href: '/dashboard/reports',
    },
    {
      label: 'Active Agents',
      value: String(stats.activeAgents),
      icon: Users,
      color: 'text-primary',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      href: '/dashboard/admin',
    },
    {
      label: 'POS Machines',
      value: String(stats.totalPOSMachines),
      icon: Wifi,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-900/20',
      href: '/dashboard/pos-machines',
    },
    {
      label: `Transactions · ${periodButtons.find(p => p.key === period)?.label}`,
      value: String(stats.totalTransactions),
      icon: Activity,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      href: '/dashboard/reports',
    },
  ] : []

  if (error) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-12 w-12" />}
        title="Unable to load dashboard"
        description={error}
        action={
          <button onClick={fetchDashboardData} className="dubai-button">
            Try Again
          </button>
        }
      />
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${role === 'admin' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              {role === 'admin'
                ? <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                : <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              }
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {role === 'admin' ? 'Admin Dashboard' : 'Agent Dashboard'}
              </h1>
              {/* Period label + live time */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                  {periodLabel}
                </span>
                <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">·</span>
                <span className="text-sm font-mono text-primary flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  {currentTime ? format(currentTime, 'hh:mm:ss aa') : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Period selector — admin only */}
          {role === 'admin' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5">
                {periodButtons.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPeriod(key)}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap ${
                      period === key
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* ── Admin KPI Cards ── */}
        {role === 'admin' && (
          <div className="kpi-grid">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="kpi-card animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                    </div>
                  </div>
                ))
              : adminCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <Link key={card.label} href={card.href} className="kpi-card hover:shadow-lg group">
                      <div className={`kpi-card-icon ${card.bg}`}>
                        <Icon className={`h-5 w-5 ${card.color}`} />
                      </div>
                      <div className="kpi-card-body">
                        <span className="kpi-card-label">{card.label}</span>
                        <span className="kpi-card-value">{card.value}</span>
                      </div>
                    </Link>
                  )
                })
            }
          </div>
        )}

        {/* ── Agent: single POS card ── */}
        {role === 'agent' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/dashboard/pos-machines" className="dubai-card p-5 hover:shadow-lg transition-all duration-200 group cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex-shrink-0">
                  <Wifi className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">POS Machines</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {loading ? '—' : stats?.totalPOSMachines ?? 0}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </div>
            </Link>
          </div>
        )}

        {/* ── Charts ── */}
        {role === 'admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading ? (
              <>
                <ChartSkeleton />
                <ChartSkeleton />
              </>
            ) : chartData ? (
              <>
                <div className="dubai-card p-5">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                    Revenue Trend
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {period === 'today' ? 'Hourly' : period === 'week' ? 'Daily (this week)' : period === 'month' ? 'Daily (this month)' : 'Monthly (this year)'}
                    </span>
                  </h3>
                  <div className="h-56 sm:h-64">
                    <Chart type="line" data={chartData.line} />
                  </div>
                </div>
                <div className="dubai-card p-5">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                    Transaction Status
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {periodButtons.find(p => p.key === period)?.label} breakdown
                    </span>
                  </h3>
                  <div className="h-56 sm:h-64">
                    <Chart type="doughnut" data={chartData.doughnut} />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div className={`grid grid-cols-1 gap-4 ${role === 'admin' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {role === 'admin' && (
            <Link href="/dashboard/settlements" className="dubai-card p-5 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
                  <Calculator className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Merchant Settlements</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Track daily card sales</p>
                </div>
              </div>
            </Link>
          )}
          {role === 'admin' && (
            <Link href="/dashboard/payments" className="dubai-card p-5 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
                  <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Quick Payment</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Record new payment</p>
                </div>
              </div>
            </Link>
          )}
          <Link href="/dashboard/reports" className="dubai-card p-5 hover:shadow-lg transition-all duration-200 group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">Generate Reports</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Export settlement data</p>
              </div>
            </div>
          </Link>
        </div>

        {/* ── Recent Transactions + Monthly Overview ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="dubai-card p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('recentActivity')}</h3>
            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-2 animate-pulse">
                    <div className="flex-1">
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-1.5" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-4" />
                  </div>
                ))
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.transactionId}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {tx.agentId?.name} → {tx.clientId?.name}
                      </p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        AED {tx.amount.toLocaleString()}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Activity className="h-8 w-8" />}
                  title="No recent transactions"
                  description="Transactions will appear here once you start processing payments"
                />
              )}
            </div>
          </div>

          <div className="dubai-card p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              {t('monthlyOverview')}
              {role === 'admin' && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {periodButtons.find(p => p.key === period)?.label}
                </span>
              )}
            </h3>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                  </div>
                ))
              ) : stats ? (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Transactions</span>
                    <span className="text-sm font-semibold text-primary">{stats.totalTransactions.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Revenue</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 break-all text-right ml-2">
                      {formatAED(stats.totalReceipts)}
                    </span>
                  </div>
                  {role === 'admin' && (
                    <>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Bank Charges</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400 break-all text-right ml-2">
                          {formatAED(stats.totalBankCharges)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50">
                        <span className="text-sm text-gray-500 dark:text-gray-400">VAT</span>
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 break-all text-right ml-2">
                          {formatAED(stats.totalVAT)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 pt-3 border-t-2 border-gray-200 dark:border-gray-600">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Net Margin</span>
                        <span className="text-sm font-bold text-primary break-all text-right ml-2">
                          {formatAED(stats.totalMargin)}
                        </span>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>

      </div>
    </ErrorBoundary>
  )
}
