'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { handleApiError, handleNetworkError } from '@/lib/errorHandling'
import { useLanguage } from '@/components/LanguageProvider'
import { useTheme } from '@/components/ThemeProvider'
import LanguageDropdown from '@/components/LanguageDropdown'
import { Moon, Sun } from 'lucide-react'

export default function SignIn() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{email?: string, password?: string}>({})
  const router = useRouter()
  const { t } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    // Auto-fill with admin credentials for testing
    setFormData({
      email: 'admin@dsrpro.ae',
      password: 'admin123'
    })
  }, [])

  const validateForm = () => {
    const newErrors: {email?: string, password?: string} = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
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
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Signed in successfully!')
        router.push('/dashboard')
      } else {
        toast.error(data.message || 'Sign in failed')
        if (data.error && process.env.NODE_ENV === 'development') {
          console.error('Detailed error:', data.error)
        }
      }
    } catch (error) {
      console.error('Network error:', error)
      if (navigator.onLine) {
        toast.error('Connection failed. Please try again.')
      } else {
        toast.error('No internet connection')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center transition-colors duration-300">
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-card bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {theme === 'light' ? 
            <Moon className="h-5 w-5 text-gray-600" /> : 
            <Sun className="h-5 w-5 text-yellow-500" />
          }
        </button>
        <LanguageDropdown />
      </div>
      
      <div className="max-w-md w-full mx-4">
        <div className="dubai-card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-dubai-gradient rounded-card flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">د</span>
            </div>
            <h1 className="text-2xl font-display font-bold bg-dubai-gradient bg-clip-text text-transparent mb-2">DSR Pro</h1>
            <h2 className="text-xl font-semibold text-text dark:text-text-dark mb-2">{t('signInTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-400">Dubai's Premier POS System</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">{t('email')}</label>
              <input
                type="email"
                required
                className={`form-input ${
                  errors.email ? 'border-danger' : ''
                }`}
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
                className={`form-input ${
                  errors.password ? 'border-danger' : ''
                }`}
                placeholder={t('password')}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              {errors.password && <p className="text-danger text-sm mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full dubai-button py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('signingIn') : t('signIn')}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link href="/auth/signup" className="text-primary hover:text-opacity-80 transition-colors">
              {t('dontHaveAccount')} {t('signUp')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}