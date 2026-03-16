'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'

interface SessionWarningModalProps {
  isOpen: boolean
  onExtend: () => void
  onLogout: () => void
}

export function SessionWarningModal({ isOpen, onExtend, onLogout }: SessionWarningModalProps) {
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    if (!isOpen) return

    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, onLogout])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Session Expiring Soon
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your session will expire due to inactivity
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Auto-logout in: <span className="font-mono font-bold text-red-600">{countdown}s</span>
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Click "Stay Logged In" to extend your session, or you'll be automatically logged out.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Logout Now
          </button>
          <button
            onClick={onExtend}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  )
}