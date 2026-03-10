'use client'
import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Users, Plus, Calculator, CreditCard, FileText, Briefcase, Store, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/components/LanguageProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import Chart from '@/components/Chart'
import { CardSkeleton, ChartSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBoundary } from '@/components/ui/error-boundary'

interface DashboardStats {
  totalReceipts: { today: number; month: number; year: number }
  totalPayments: { today: number; month: number; year: number }
  pendingPayments: number
  activeVendors: number
  totalTransactions: number
  totalCommission: number
}

interface RecentTransaction {
  _id: string
  transactionId: string
  amount: number
  status: string
  vendorId: { name: string }
  clientId: { name: string }
  createdAt: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useLanguage()
  const { user } = useCurrentUser()
  const role = user?.role || 'agent'

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [statsRes, transactionsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/transactions?limit=5')
      ])
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
        
        // Prepare chart data
        setChartData({
          line: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Revenue',
              data: [65000, 59000, 80000, 81000, 56000, statsData.totalReceipts.month],
              borderColor: '#D4AF37',
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              borderWidth: 2
            }]
          },
          doughnut: {
            labels: ['Completed', 'Pending', 'Failed'],
            datasets: [{
              data: [statsData.totalTransactions, 5, 2],
              backgroundColor: ['#10B981', '#F59E0B', '#EF4444']
            }]
          }
        })
      }
      
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json()
        setRecentTransactions(transactionsData.transactions || [])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-12 w-12" />}
        title="Unable to load dashboard"
        description={error}
        action={
          <button
            onClick={fetchDashboardData}
            className="dubai-button"
          >
            Try Again
          </button>
        }
      />
    )
  }

  return (
    <ErrorBoundary>
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-3">
            {role === 'admin' && <ShieldCheck className="h-7 w-7 text-primary" />}
            {role === 'agent' && <Briefcase className="h-7 w-7 text-blue-600 dark:text-blue-400" />}
            {role === 'vendor' && <Store className="h-7 w-7 text-purple-600 dark:text-purple-400" />}
            <div>
              <h1 className="text-2xl font-semibold text-text dark:text-text-dark">
                {role === 'admin' ? 'Admin Dashboard' : role === 'agent' ? 'Agent Dashboard' : 'Vendor Dashboard'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {role === 'admin' 
                  ? 'Complete system overview and management'
                  : role === 'agent'
                  ? 'Your transactions, receipts, and commission'
                  : 'Your settlements, payments, and balance'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))
          ) : stats ? (
            <>
              {/* Card 1: Revenue / Sales Today */}
              <div className="dubai-card p-6 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {role === 'vendor' ? 'Sales Today' : t('totalReceiptsToday')}
                      </dt>
                      <dd className="text-lg font-medium text-text dark:text-text-dark">
                        AED {stats.totalReceipts.today.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Card 2: Payments / Pending */}
              <div className="dubai-card p-6 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingDown className="h-6 w-6 text-danger" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {role === 'vendor' ? 'Pending Balance' : t('totalPaymentsToday')}
                      </dt>
                      <dd className="text-lg font-medium text-text dark:text-text-dark">
                        AED {(role === 'vendor' ? stats.pendingPayments : stats.totalPayments.today).toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Card 3: Commission / Monthly Revenue */}
              <div className="dubai-card p-6 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-warning" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {role === 'vendor' ? 'Monthly Revenue' : 'Commission Earned'}
                      </dt>
                      <dd className="text-lg font-medium text-text dark:text-text-dark">
                        AED {(role === 'vendor' ? stats.totalReceipts.month : stats.totalCommission).toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Card 4: Vendors / Transactions */}
              <div className="dubai-card p-6 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {role === 'vendor' ? (
                      <CreditCard className="h-6 w-6 text-primary" />
                    ) : (
                      <Users className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        {role === 'admin' ? t('activeVendors') : role === 'agent' ? 'Active Vendors' : 'Transactions'}
                      </dt>
                      <dd className="text-lg font-medium text-text dark:text-text-dark">
                        {role === 'vendor' ? stats.totalTransactions : stats.activeVendors}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Charts */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {loading ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : chartData ? (
            <>
              <div className="dubai-card p-6 hover:shadow-lg transition-shadow duration-200">
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">Revenue Trend</h3>
                <div className="h-64">
                  <Chart type="line" data={chartData.line} />
                </div>
              </div>
              
              <div className="dubai-card p-6 hover:shadow-lg transition-shadow duration-200">
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">Transaction Status</h3>
                <div className="h-64">
                  <Chart type="doughnut" data={chartData.doughnut} />
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Quick Actions — role-aware */}
        <div className={`mt-8 grid grid-cols-1 gap-6 ${role === 'vendor' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {(role === 'admin' || role === 'vendor') && (
            <Link href="/dashboard/settlements" className="dubai-card p-6 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-center">
                <Calculator className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-text dark:text-text-dark">
                    {role === 'vendor' ? 'My Settlements' : 'Merchant Settlements'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {role === 'vendor' ? 'View your settlement records' : 'Track daily card sales like Excel'}
                  </p>
                </div>
              </div>
            </Link>
          )}
          
          {(role === 'admin' || role === 'agent') && (
            <Link href="/dashboard/payments" className="dubai-card p-6 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-success group-hover:scale-110 transition-transform" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-text dark:text-text-dark">Quick Payment</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Record new payment</p>
                </div>
              </div>
            </Link>
          )}
          
          <Link href="/dashboard/reports" className="dubai-card p-6 hover:shadow-lg transition-all duration-200 group">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-warning group-hover:scale-110 transition-transform" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-text dark:text-text-dark">
                  {role === 'vendor' ? 'My Reports' : 'Generate Reports'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {role === 'vendor' ? 'Download your settlement data' : 'Export settlement data'}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Transactions */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="dubai-card p-6 hover:shadow-lg transition-shadow duration-200">
            <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">{t('recentActivity')}</h3>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                    </div>
                    <div className="ml-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                    </div>
                  </div>
                ))
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div key={transaction._id} className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md transition-colors">
                    <div>
                      <p className="text-sm font-medium text-text dark:text-text-dark">
                        {transaction.transactionId}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {transaction.vendorId?.name} → {transaction.clientId?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-success">
                      AED {transaction.amount.toLocaleString()}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Plus className="h-8 w-8" />}
                  title="No recent transactions"
                  description="Transactions will appear here once you start processing payments"
                />
              )}
            </div>
          </div>

          <div className="dubai-card p-6 hover:shadow-lg transition-shadow duration-200">
            <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">{t('monthlyOverview')}</h3>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                  </div>
                ))
              ) : stats ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Transactions (Month)</span>
                    <span className="text-sm font-medium text-primary">
                      {stats.totalTransactions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Revenue (Month)</span>
                    <span className="text-sm font-medium text-success">
                      AED {stats.totalReceipts.month.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border dark:border-border-dark pt-4">
                    <span className="text-sm font-medium text-text dark:text-text-dark">Net Commission</span>
                    <span className="text-sm font-medium text-primary">
                      AED {stats.totalCommission.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}