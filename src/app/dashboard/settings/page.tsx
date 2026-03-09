'use client'
import { useState } from 'react'
import { User, Bell, Shield, Globe, Palette, Save, History } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { useTheme } from '@/components/ThemeProvider'
import { toast } from 'react-hot-toast'
import SessionHistory from '@/components/SessionHistory'

export default function Settings() {
  const { t, language, setLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', name: t('profile'), icon: User },
    { id: 'notifications', name: t('notifications'), icon: Bell },
    { id: 'security', name: t('security'), icon: Shield },
    { id: 'sessions', name: 'Sessions', icon: History },
    { id: 'preferences', name: 'Preferences', icon: Globe },
  ]

  const handleSave = () => {
    toast.success(t('save') + ' successful')
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-text dark:text-text-dark">{t('settings')}</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{t('systemSettings')}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
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
                      : 'text-text dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="dubai-card p-6">
            {activeTab === 'profile' && (
              <div>
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">{t('profile')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                      {t('fullName')}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-white dark:bg-gray-700 text-text dark:text-text-dark"
                      defaultValue="Admin User"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                      {t('email')}
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-white dark:bg-gray-700 text-text dark:text-text-dark"
                      defaultValue="admin@dsrpro.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                      {t('phoneNumber')}
                    </label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-white dark:bg-gray-700 text-text dark:text-text-dark"
                      defaultValue="+971 50 123 4567"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">{t('notifications')}</h3>
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-3" defaultChecked />
                    <span className="text-text dark:text-text-dark">Email notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-3" defaultChecked />
                    <span className="text-text dark:text-text-dark">SMS notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-3" />
                    <span className="text-text dark:text-text-dark">Push notifications</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">{t('security')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                      Current {t('password')}
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-white dark:bg-gray-700 text-text dark:text-text-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                      New {t('password')}
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-white dark:bg-gray-700 text-text dark:text-text-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-1">
                      Confirm New {t('password')}
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-white dark:bg-gray-700 text-text dark:text-text-dark"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sessions' && (
              <SessionHistory />
            )}

            {activeTab === 'preferences' && (
              <div>
                <h3 className="text-lg font-medium text-text dark:text-text-dark mb-4">Preferences</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                      <Globe className="inline h-4 w-4 mr-1" />
                      {t('language')}
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="w-full px-3 py-2 border border-border dark:border-border-dark rounded-card bg-white dark:bg-gray-700 text-text dark:text-text-dark"
                    >
                      <option value="en">English</option>
                      <option value="ar">العربية</option>
                      <option value="hi">हिंदी</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                      <Palette className="inline h-4 w-4 mr-1" />
                      {t('theme')}
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="theme"
                          value="light"
                          checked={theme === 'light'}
                          onChange={(e) => setTheme(e.target.value as any)}
                          className="mr-2"
                        />
                        <span className="text-text dark:text-text-dark">{t('lightMode')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="theme"
                          value="dark"
                          checked={theme === 'dark'}
                          onChange={(e) => setTheme(e.target.value as any)}
                          className="mr-2"
                        />
                        <span className="text-text dark:text-text-dark">{t('darkMode')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                className="dubai-button inline-flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}