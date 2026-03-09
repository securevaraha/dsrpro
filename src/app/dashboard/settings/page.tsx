'use client'
import { useState, useEffect } from 'react'
import { Save, User, Bell, Shield, Globe, Palette, Moon, Sun } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/components/LanguageProvider'
import { useTheme } from '@/components/ThemeProvider'

export default function Settings() {
  const { t, language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
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
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings)
      })
      
      if (response.ok) {
        toast.success('Notification settings updated')
      } else {
        throw new Error('Failed to update notifications')
      }
    } catch (error) {
      toast.error('Failed to update notification settings')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: t('profile'), icon: User },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'security', label: t('security'), icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'language', label: t('language'), icon: Globe }
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text dark:text-text-dark">{t('settings')}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('systemSettings')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-card transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="dubai-card p-6">
            {activeTab === 'profile' && (
              <div>
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-6">{t('profile')}</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                        {t('name')}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                        {t('email')}
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                        {t('phoneNumber')}
                      </label>
                      <input
                        type="tel"
                        className="form-input"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                        {t('companyName')}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={profileData.companyName}
                        onChange={(e) => setProfileData({...profileData, companyName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                      Address
                    </label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={profileData.address}
                      onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    />
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={loading}
                    className="dubai-button flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : t('save')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-6">{t('notifications')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-text dark:text-text-dark">Email Notifications</h4>
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
                      <h4 className="text-sm font-medium text-text dark:text-text-dark">Push Notifications</h4>
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
                      <h4 className="text-sm font-medium text-text dark:text-text-dark">Weekly Reports</h4>
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
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-6">Appearance</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-text dark:text-text-dark mb-4">{t('theme')}</h4>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => theme !== 'light' && toggleTheme()}
                        className={`flex items-center p-4 rounded-card border-2 transition-colors ${
                          theme === 'light'
                            ? 'border-primary bg-primary/10'
                            : 'border-border dark:border-border-dark hover:border-primary/50'
                        }`}
                      >
                        <Sun className="h-6 w-6 mr-3" />
                        <div className="text-left">
                          <div className="font-medium text-text dark:text-text-dark">{t('lightMode')}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Clean and bright interface</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => theme !== 'dark' && toggleTheme()}
                        className={`flex items-center p-4 rounded-card border-2 transition-colors ${
                          theme === 'dark'
                            ? 'border-primary bg-primary/10'
                            : 'border-border dark:border-border-dark hover:border-primary/50'
                        }`}
                      >
                        <Moon className="h-6 w-6 mr-3" />
                        <div className="text-left">
                          <div className="font-medium text-text dark:text-text-dark">{t('darkMode')}</div>
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
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-6">{t('language')}</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`p-4 rounded-card border-2 text-left transition-colors ${
                        language === 'en'
                          ? 'border-primary bg-primary/10'
                          : 'border-border dark:border-border-dark hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-text dark:text-text-dark">English</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Default language</div>
                    </button>
                    
                    <button
                      onClick={() => setLanguage('ar')}
                      className={`p-4 rounded-card border-2 text-left transition-colors ${
                        language === 'ar'
                          ? 'border-primary bg-primary/10'
                          : 'border-border dark:border-border-dark hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-text dark:text-text-dark">العربية</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Arabic language</div>
                    </button>
                    
                    <button
                      onClick={() => setLanguage('hi')}
                      className={`p-4 rounded-card border-2 text-left transition-colors ${
                        language === 'hi'
                          ? 'border-primary bg-primary/10'
                          : 'border-border dark:border-border-dark hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-text dark:text-text-dark">हिंदी</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Hindi language</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-6">{t('security')}</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-text dark:text-text-dark mb-4">Change Password</h4>
                    <div className="space-y-4 max-w-md">
                      <input
                        type="password"
                        placeholder="Current Password"
                        className="form-input"
                      />
                      <input
                        type="password"
                        placeholder="New Password"
                        className="form-input"
                      />
                      <input
                        type="password"
                        placeholder="Confirm New Password"
                        className="form-input"
                      />
                      <button className="dubai-button">
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}