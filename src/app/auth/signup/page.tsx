'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { handleApiError, handleNetworkError } from '@/lib/errorHandling'
import { useLanguage } from '@/components/LanguageProvider'
import LanguageDropdown from '@/components/LanguageDropdown'
import { generateTestData } from '@/lib/testData'

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    companyName: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    // Auto-fill with test data for development
    const testData = generateTestData()
    setFormData(testData)
  }, [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (formData.phone && !/^\+971[0-9]{9}$/.test(formData.phone.replace(/\D/g, '+971'))) {
      newErrors.phone = 'Invalid phone number'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
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
        toast.success('Account created successfully!')
        router.push('/auth/signin')
      } else {
        toast.error(data.message || 'Sign up failed')
      }
    } catch (error) {
      if (navigator.onLine) {
        handleApiError(error)
      } else {
        handleNetworkError()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center py-12">
      <div className="absolute top-4 right-4">
        <LanguageDropdown />
      </div>
      
      <div className="max-w-2xl w-full mx-4">
        <div className="dubai-card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-dubai-gradient rounded-card flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">د</span>
            </div>
            <h1 className="text-2xl font-display font-bold bg-dubai-gradient bg-clip-text text-transparent mb-2">DSR Pro</h1>
            <h2 className="text-xl font-semibold text-text dark:text-text-dark mb-2">{t('signUpTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-400">Dubai's Premier POS System</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">{t('fullName')}</label>
                <input
                  type="text"
                  required
                  className={`w-full px-4 py-3 border rounded-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                    errors.name ? 'border-danger' : 'border-border dark:border-border-dark'
                  } bg-white dark:bg-gray-800 text-text dark:text-text-dark`}
                  placeholder={t('fullName')}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                {errors.name && <p className="text-danger text-sm mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">{t('email')}</label>
                <input
                  type="email"
                  required
                  className={`w-full px-4 py-3 border rounded-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                    errors.email ? 'border-danger' : 'border-border dark:border-border-dark'
                  } bg-white dark:bg-gray-800 text-text dark:text-text-dark`}
                  placeholder={t('email')}
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                {errors.email && <p className="text-danger text-sm mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">{t('password')}</label>
                <input
                  type="password"
                  required
                  className={`w-full px-4 py-3 border rounded-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                    errors.password ? 'border-danger' : 'border-border dark:border-border-dark'
                  } bg-white dark:bg-gray-800 text-text dark:text-text-dark`}
                  placeholder={t('password')}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                {errors.password && <p className="text-danger text-sm mt-1">{errors.password}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">{t('role')}</label>
                <select
                  className="w-full px-4 py-3 border border-border dark:border-border-dark rounded-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-text dark:text-text-dark"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="agent">{t('agent')}</option>
                  <option value="vendor">{t('vendor')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">{t('companyName')}</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-border dark:border-border-dark rounded-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-text dark:text-text-dark"
                  placeholder={t('companyName')}
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">{t('phoneNumber')}</label>
                <input
                  type="tel"
                  className={`w-full px-4 py-3 border rounded-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                    errors.phone ? 'border-danger' : 'border-border dark:border-border-dark'
                  } bg-white dark:bg-gray-800 text-text dark:text-text-dark`}
                  placeholder={t('phoneNumber')}
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
                {errors.phone && <p className="text-danger text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full dubai-button py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('creatingAccount') : t('signUp')}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link href="/auth/signin" className="text-primary hover:text-opacity-80 transition-colors">
              {t('alreadyHaveAccount')} {t('signIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}