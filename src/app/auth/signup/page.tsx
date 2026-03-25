'use client'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/components/LanguageProvider'
import { useTheme } from '@/components/ThemeProvider'
import LanguageDropdown from '@/components/LanguageDropdown'
import { Moon, Sun, Eye, EyeOff, ArrowRight, ArrowLeft, Users, Receipt, BarChart3, CheckCircle, Loader2 } from 'lucide-react'

const features = [
  { icon: Users, label: 'Role-based access', desc: 'Tailored dashboard for your role' },
  { icon: Receipt, label: 'Automated settlements', desc: 'Commission & margin calculations' },
  { icon: BarChart3, label: 'Detailed reports', desc: 'Export and analyze your data' },
]

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'agent',
    companyName: '', phone: '', address: '',
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const { t } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.name.trim()) e.name = 'Name is required'
    if (!formData.email) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email format'
    if (!formData.password) e.password = 'Password is required'
    else if (formData.password.length < 8) e.password = 'Minimum 8 characters'
    else if (!/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) e.password = 'Must contain a letter and a number'
    if (!formData.phone) e.phone = 'Phone is required'
    else if (!/^\+?[0-9\s\-()]{7,20}$/.test(formData.phone)) e.phone = 'Invalid phone number'
    if (!formData.companyName.trim()) e.companyName = 'Company name is required'
    if (!formData.address.trim()) e.address = 'Address is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrors({})
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        toast.success('Account created! Please wait for admin approval.')
      } else {
        toast.error(data.message || 'Sign up failed')
      }
    } catch {
      toast.error(navigator.onLine ? 'Connection failed. Please try again.' : 'No internet connection')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (() => {
    const p = formData.password
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^a-zA-Z0-9]/.test(p)) s++
    return s
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength]
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-400'][passwordStrength]

  const fieldClass = (field: string) =>
    `relative rounded-xl border-2 transition-all duration-200 ${
      errors[field]
        ? 'border-danger bg-red-50/50 dark:bg-red-900/10'
        : focusedField === field
        ? 'border-primary shadow-[0_0_0_3px_rgba(212,175,55,0.12)]'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }`

  const inputClass = 'w-full px-4 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-sm rounded-xl'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'
  const errorClass = 'text-danger text-xs mt-1.5'

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Submitted</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
            Your <span className="font-semibold text-gray-900 dark:text-white">agent</span> account has been submitted for review.
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-8">
            An administrator will activate your account. You&apos;ll be able to sign in once approved.
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 bg-dubai-gradient text-white font-semibold py-3 px-8 rounded-xl shadow-dubai hover:brightness-110 transition-all group"
          >
            <span>Go to Sign In</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    )
  }

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
              Join our<br />
              <span className="bg-dubai-gradient bg-clip-text text-transparent">growing network</span><br />
              of professionals.
            </h2>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Register as an agent and start managing your operations with powerful tools.
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
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-14 py-8">
          <div className="w-full max-w-[480px]">
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Create your account
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5">
                Fill in your details to register as an agent
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('fullName') || 'Full Name'}</label>
                  <div className={fieldClass('name')}>
                    <input type="text" required className={inputClass} placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
                  </div>
                  {errors.name && <p className={errorClass}>{errors.name}</p>}
                </div>
                <div>
                  <label className={labelClass}>{t('email') || 'Email Address'}</label>
                  <div className={fieldClass('email')}>
                    <input type="email" required className={inputClass} placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
                  </div>
                  {errors.email && <p className={errorClass}>{errors.email}</p>}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={labelClass}>{t('password') || 'Password'}</label>
                <div className={fieldClass('password')}>
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    className={`${inputClass} pr-11`} placeholder="Min 8 chars, letter + number"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= passwordStrength ? strengthColor : 'bg-gray-200 dark:bg-gray-700'}`} />
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium">{strengthLabel}</span>
                  </div>
                )}
                {errors.password && <p className={errorClass}>{errors.password}</p>}
              </div>

              {/* Phone + Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('phoneNumber') || 'Phone Number'}</label>
                  <div className={fieldClass('phone')}>
                    <input type="tel" required className={inputClass} placeholder="+971-XX-XXX-XXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} />
                  </div>
                  {errors.phone && <p className={errorClass}>{errors.phone}</p>}
                </div>
                <div>
                  <label className={labelClass}>{t('companyName') || 'Company Name'}</label>
                  <div className={fieldClass('companyName')}>
                    <input type="text" required className={inputClass} placeholder="Your company"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      onFocus={() => setFocusedField('companyName')} onBlur={() => setFocusedField(null)} />
                  </div>
                  {errors.companyName && <p className={errorClass}>{errors.companyName}</p>}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className={labelClass}>Address</label>
                <div className={fieldClass('address')}>
                  <textarea rows={2} required
                    className={`${inputClass} resize-none`} placeholder="Street, City, Country"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    onFocus={() => setFocusedField('address')} onBlur={() => setFocusedField(null)} />
                </div>
                {errors.address && <p className={errorClass}>{errors.address}</p>}
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-dubai-gradient text-white font-semibold py-3.5 px-6 rounded-xl shadow-dubai hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 group text-sm mt-1"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /><span>Creating account...</span></>
                ) : (
                  <><span>Create Account</span><ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></>
                )}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white dark:bg-gray-900 text-xs text-gray-400 dark:text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>

            <Link
              href="/auth/signin"
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-all duration-200 group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Sign in to your account</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
