'use client'
import { useState, useEffect } from 'react'
import { Monitor, Smartphone, Globe, Clock, MapPin } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { format } from 'date-fns'

interface Session {
  _id: string
  sessionId: string
  loginTime: string
  logoutTime?: string
  ipAddress: string
  isActive: boolean
  deviceInfo: {
    browser: string
    os: string
    device: string
  }
}

export default function SessionHistory() {
  const { t } = useLanguage()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const endSession = async (sessionId: string) => {
    try {
      await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
      fetchSessions()
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-900 dark:text-white">{t('loading')}</div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Session History</h3>
      <div className="space-y-4">
        {sessions.map((session) => (
          <div key={session._id} className="dubai-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {session.deviceInfo.device === 'Mobile' ? (
                  <Smartphone className="h-5 w-5 text-primary" />
                ) : (
                  <Monitor className="h-5 w-5 text-primary" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {session.deviceInfo.browser} on {session.deviceInfo.os}
                    </span>
                    {session.isActive && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(session.loginTime), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>{session.ipAddress}</span>
                    </div>
                  </div>
                  {session.logoutTime && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Logged out: {format(new Date(session.logoutTime), 'MMM dd, yyyy HH:mm')}
                    </div>
                  )}
                </div>
              </div>
              {session.isActive && (
                <button
                  onClick={() => endSession(session.sessionId)}
                  className="text-danger hover:text-red-700 text-sm"
                >
                  End Session
                </button>
              )}
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No session history found
          </div>
        )}
      </div>
    </div>
  )
}
