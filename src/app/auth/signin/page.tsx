'use client'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/components/LanguageProvider'
import { useTheme } from '@/components/ThemeProvider'
import LanguageDropdown from '@/components/LanguageDropdown'
import { Moon, Sun, Eye, EyeOff, ArrowRight, Shield, Zap, BarChart3, Loader2 } from 'lucide-react'

const features = [
  { icon: Shield, label: 'Bank-grade security', desc: 'End-to-end encrypted data' },
  { icon: Zap, label: 'Real-time processing', desc: 'Instant settlement calculations' },
  { icon: BarChart3, label: 'Smart analytics', desc: 'Commission & revenue insights' },
]

export default function SignIn() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const { t } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  const validate = () => {
    const e: typeof errors = {}
    if (!formData.email) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email format'
    if (!formData.password) e.password = 'Password is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrors({})
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Signed in successfully!')
        window.location.href = '/dashboard'
      } else {
        toast.error(data.message || 'Sign in failed')
      }
    } catch {
      toast.error(navigator.onLine ? 'Connection failed. Please try again.' : 'No internet connection')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = (field: string) =>
    `relative rounded-xl border-2 transition-all duration-200 ${
      errors[field as keyof typeof errors]
        ? 'border-danger bg-red-50/50 dark:bg-red-900/10'
        : focusedField === field
        ? 'border-primary shadow-[0_0_0_3px_rgba(212,175,55,0.12)]'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }`

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[460px] xl:w-[500px] relative bg-gradient-to-br from-[#1A1A2E] via-[#16213E] to-[#0F3460] flex-col justify-between p-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-dubai-gradient rounded-xl flex items-center justify-center shadow-dubai">
              <span className="text-white font-bold text-lg">د</span>
            </div>
            <span className="text-white font-display text-xl font-bold tracking-tight">DSR Pro</span>
          </div>
          <p className="text-white/40 text-sm mt-2">Dubai&apos;s Premier POS & ERP System</p>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-white text-3xl font-display font-bold leading-tight mb-3">
              Manage your<br />
              <span className="bg-dubai-gradient bg-clip-text text-transparent">business operations</span><br />
              with confidence.
            </h2>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Settlement tracking, commission management, and real-time reporting — all in one place.
            </p>
          </div>
          <div className="space-y-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.1] transition-colors">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium">{label}</p>
                  <p className="text-white/35 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/25 text-xs">&copy; 2026 DSR Pro. All rights reserved.</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 transition-colors duration-300">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 bg-dubai-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">د</span>
            </div>
            <span className="font-display font-bold text-gray-900 dark:text-white">DSR Pro</span>
          </div>
          <div className="lg:ml-auto flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <LanguageDropdown />
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-14 py-10">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Welcome back
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('email') || 'Email address'}
                </label>
                <div className={fieldClass('email')}>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-sm rounded-xl"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
                {errors.email && <p className="text-danger text-xs mt-1.5">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('password') || 'Password'}
                </label>
                <div className={fieldClass('password')}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full px-4 py-3 pr-11 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-sm rounded-xl"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-danger text-xs mt-1.5">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dubai-gradient text-white font-semibold py-3.5 px-6 rounded-xl shadow-dubai hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 group text-sm mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>{t('signIn') || 'Sign In'}</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white dark:bg-gray-900 text-xs text-gray-400 dark:text-gray-500">
                  Don&apos;t have an account?
                </span>
              </div>
            </div>

            <Link
              href="/auth/signup"
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-all duration-200 group"
            >
              <span>Create an account</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
