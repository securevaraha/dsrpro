'use client'
import { useState, useEffect } from 'react'
import { Save, User, Bell, Shield, Globe, Palette, Moon, Sun, AlertTriangle, Trash2, UserX, Database } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/components/LanguageProvider'
import { useTheme } from '@/components/ThemeProvider'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export default function Settings() {
  const { t, language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const { user } = useCurrentUser()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    address: ''
  })
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    weeklyReports: true
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [dangerModalOpen, setDangerModalOpen] = useState(false)
  const [dangerStep, setDangerStep] = useState<1 | 2>(1)
  const [dangerAction, setDangerAction] = useState<'delete-account' | 'delete-all-data' | null>(null)
  const [dangerPassword, setDangerPassword] = useState('')
  const [dangerConfirmation, setDangerConfirmation] = useState('')
  const [dangerLoading, setDangerLoading] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfileData(data.user)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  const saveProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })
      
      if (response.ok) {
        toast.success('Profile updated successfully')
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const saveNotifications = async () => {
    try {
      setLoading(true)
      // Save notification preferences locally
      localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings))
      toast.success('Notification settings updated')
    } catch (error) {
      toast.error('Failed to update notification settings')
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required')
      return
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    try {
      setLoading(true)
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })
      if (response.ok) {
        toast.success('Password updated successfully')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update password')
      }
    } catch (error) {
      toast.error('Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: t('profile'), icon: User },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'security', label: t('security'), icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'language', label: t('language'), icon: Globe },
    ...(isAdmin ? [{ id: 'danger', label: 'Danger Zone', icon: AlertTriangle }] : [])
  ]

  const closeDangerModal = () => {
    setDangerModalOpen(false)
    setDangerStep(1)
    setDangerAction(null)
    setDangerPassword('')
    setDangerConfirmation('')
    setDangerLoading(false)
  }

  const openDangerFlow = (action: 'delete-account' | 'delete-all-data') => {
    setDangerAction(action)
    setDangerStep(1)
    setDangerPassword('')
    setDangerConfirmation('')
    setDangerModalOpen(true)
  }

  const getConfirmationPhrase = () => {
    if (dangerAction === 'delete-account') return 'DELETE ACCOUNT'
    if (dangerAction === 'delete-all-data') return 'DELETE ALL DATA'
    return ''
  }

  const handleDangerContinue = () => {
    if (!dangerPassword.trim()) {
      toast.error('Password is required')
      return
    }
    setDangerStep(2)
  }

  const handleDangerSubmit = async () => {
    if (!dangerAction) return

    const expectedPhrase = getConfirmationPhrase()
    if (dangerConfirmation.trim() !== expectedPhrase) {
      toast.error(`Type ${expectedPhrase} to confirm`)
      return
    }

    try {
      setDangerLoading(true)
      const endpoint = dangerAction === 'delete-account'
        ? '/api/settings/danger/delete-account'
        : '/api/settings/danger/delete-all-data'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: dangerPassword,
          confirmation: dangerConfirmation,
        })
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Action failed')
      }

      if (dangerAction === 'delete-account') {
        toast.success('Account deleted. Redirecting to sign in...')
        closeDangerModal()
        window.location.href = '/auth/signin'
        return
      }

      toast.success('All non-user data deleted successfully')
      closeDangerModal()
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete action')
    } finally {
      setDangerLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{t('settings')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('systemSettings')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors whitespace-nowrap ${
                    activeTab === tab.id && tab.id === 'danger'
                      ? 'bg-red-600 text-white shadow-sm'
                      : activeTab === tab.id
                        ? 'bg-primary text-white'
                        : tab.id === 'danger'
                          ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] mr-2.5 ${tab.id === 'danger' && activeTab !== tab.id ? 'text-red-600 dark:text-red-400' : ''}`} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="dubai-card p-5 sm:p-8">
            {activeTab === 'profile' && (
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-5">{t('profile')}</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">{t('name')}</label>
                      <input type="text" className="form-input" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="form-label">{t('email')}</label>
                      <input type="email" className="form-input" value={profileData.email} onChange={(e) => setProfileData({...profileData, email: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">{t('phoneNumber')}</label>
                      <input type="tel" className="form-input" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="form-label">{t('companyName')}</label>
                      <input type="text" className="form-input" value={profileData.companyName} onChange={(e) => setProfileData({...profileData, companyName: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Address</label>
                    <textarea className="form-input" rows={3} value={profileData.address} onChange={(e) => setProfileData({...profileData, address: e.target.value})} />
                  </div>
                  <button onClick={saveProfile} disabled={loading} className="dubai-button flex items-center">
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : t('save')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white mb-6 sm:mb-8">{t('notifications')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          emailNotifications: e.target.checked
                        })}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/25 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Push Notifications</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive push notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationSettings.pushNotifications}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          pushNotifications: e.target.checked
                        })}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/25 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Weekly Reports</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive weekly summary reports</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationSettings.weeklyReports}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          weeklyReports: e.target.checked
                        })}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 dark:peer-focus:ring-primary/25 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <button
                    onClick={saveNotifications}
                    disabled={loading}
                    className="dubai-button flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : t('save')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div>
                <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white mb-6 sm:mb-8">Appearance</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-4">{t('theme')}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={() => theme !== 'light' && toggleTheme()}
                        className={`flex items-center p-4 rounded-xl border-2 transition-colors ${
                          theme === 'light'
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                        }`}
                      >
                        <Sun className="h-6 w-6 mr-3" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">{t('lightMode')}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Clean and bright interface</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => theme !== 'dark' && toggleTheme()}
                        className={`flex items-center p-4 rounded-xl border-2 transition-colors ${
                          theme === 'dark'
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                        }`}
                      >
                        <Moon className="h-6 w-6 mr-3" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">{t('darkMode')}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Easy on the eyes</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'language' && (
              <div>
                <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white mb-6 sm:mb-8">{t('language')}</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`p-4 rounded-xl border-2 text-left transition-colors ${
                        language === 'en'
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">English</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Default language</div>
                    </button>
                    
                    <button
                      onClick={() => setLanguage('ar')}
                      className={`p-4 rounded-xl border-2 text-left transition-colors ${
                        language === 'ar'
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">العربية</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Arabic language</div>
                    </button>
                    
                    <button
                      onClick={() => setLanguage('hi')}
                      className={`p-4 rounded-xl border-2 text-left transition-colors ${
                        language === 'hi'
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">हिंदी</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Hindi language</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-5">{t('security')}</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="form-label">Current Password</label>
                    <input type="password" placeholder="Enter current password" className="form-input"
                      value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="form-label">New Password</label>
                    <input type="password" placeholder="Enter new password" className="form-input"
                      value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" placeholder="Confirm new password" className="form-input"
                      value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    />
                  </div>
                  <button onClick={changePassword} disabled={loading} className="dubai-button">
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'danger' && isAdmin && (
              <div>
                <h3 className="text-base font-semibold text-red-700 dark:text-red-400 mb-5">Danger Zone</h3>
                <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-4 sm:p-5 mb-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">These actions are irreversible.</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Deleting account or deleting all data cannot be undone. You will be asked for your password and a final confirmation message.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-red-300/80 dark:border-red-900/50 bg-red-50/40 dark:bg-red-900/10 p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                        <UserX className="h-4 w-4 text-red-700 dark:text-red-300" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Account</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Permanently delete your admin account and end your session.
                    </p>
                    <button
                      type="button"
                      onClick={() => openDangerFlow('delete-account')}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </button>
                  </div>

                  <div className="rounded-xl border border-red-300/80 dark:border-red-900/50 bg-red-50/40 dark:bg-red-900/10 p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                        <Database className="h-4 w-4 text-red-700 dark:text-red-300" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Delete All Data</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Delete all database information except users, including receipts, payments, brands, POS machines, segments, transactions, notifications, and sessions.
                    </p>
                    <button
                      type="button"
                      onClick={() => openDangerFlow('delete-all-data')}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
                    >
                      <Database className="h-4 w-4" />
                      Delete All Data
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dangerModalOpen} onOpenChange={(open) => !open && closeDangerModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dangerAction === 'delete-account' ? 'Delete Account' : 'Delete All Data'}</DialogTitle>
            <DialogDescription>
              {dangerStep === 1
                ? 'Step 1 of 2: Verify your password before continuing.'
                : 'Step 2 of 2: Final confirmation. This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-3 mb-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {dangerAction === 'delete-account'
                ? 'Warning: Your admin account will be permanently removed.'
                : 'Warning: All non-user data will be permanently deleted from the database.'}
            </p>
          </div>

          {dangerStep === 1 ? (
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={dangerPassword}
                onChange={(e) => setDangerPassword(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="form-label">
                Type <strong>{getConfirmationPhrase()}</strong> to confirm
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={getConfirmationPhrase()}
                value={dangerConfirmation}
                onChange={(e) => setDangerConfirmation(e.target.value.toUpperCase())}
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDangerModal}
              disabled={dangerLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            {dangerStep === 1 ? (
              <button
                type="button"
                onClick={handleDangerContinue}
                disabled={dangerLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDangerSubmit}
                disabled={dangerLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                {dangerLoading ? 'Processing...' : dangerAction === 'delete-account' ? 'Delete Account' : 'Delete All Data'}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
