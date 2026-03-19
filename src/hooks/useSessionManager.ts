'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

const IDLE_TIME = 10 * 60 * 1000       // 10 minutes
const WARNING_TIME = 9 * 60 * 1000     // show warning at 9 minutes
const ACTIVITY_THROTTLE = 2 * 60 * 1000 // sync to server at most every 2 minutes

export function useSessionManager() {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const idleTimerRef = useRef<NodeJS.Timeout>()
  const warningTimerRef = useRef<NodeJS.Timeout>()
  const lastServerSyncRef = useRef<number>(0)

  const updateServerActivity = async () => {
    const now = Date.now()
    if (now - lastServerSyncRef.current < ACTIVITY_THROTTLE) return
    lastServerSyncRef.current = now
    try {
      const res = await fetch('/api/sessions/activity', { method: 'POST' })
      if (res.status === 403) {
        handleAutoLogout('Your account has been deactivated by an admin.')
      }
    } catch {}
  }

  const resetTimers = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)

    setShowWarning(false)
    updateServerActivity()

    warningTimerRef.current = setTimeout(() => setShowWarning(true), WARNING_TIME)
    idleTimerRef.current = setTimeout(() => handleAutoLogout('Session expired due to inactivity'), IDLE_TIME)
  }

  const handleAutoLogout = async (message: string = 'Session expired due to inactivity') => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.error(message)
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
    handleAutoLogout('Logged out successfully')
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