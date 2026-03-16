'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

const IDLE_TIME = 10 * 60 * 1000 // 10 minutes in milliseconds
const WARNING_TIME = 9 * 60 * 1000 // 9 minutes - show warning 1 minute before logout

export function useSessionManager() {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const idleTimerRef = useRef<NodeJS.Timeout>()
  const warningTimerRef = useRef<NodeJS.Timeout>()
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimers = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    
    lastActivityRef.current = Date.now()
    setShowWarning(false)

    // Set warning timer (9 minutes)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
    }, WARNING_TIME)

    // Set logout timer (10 minutes)
    idleTimerRef.current = setTimeout(() => {
      handleAutoLogout()
    }, IDLE_TIME)
  }

  const handleAutoLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.error('Session expired due to inactivity')
      router.push('/auth/signin')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/auth/signin')
    }
  }

  const extendSession = () => {
    resetTimers()
    toast.success('Session extended')
  }

  const logout = () => {
    handleAutoLogout()
  }

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const resetActivity = () => {
      resetTimers()
    }

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetActivity, true)
    })

    // Initialize timers
    resetTimers()

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, resetActivity, true)
      })
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    }
  }, [])

  return {
    showWarning,
    extendSession,
    logout
  }
}