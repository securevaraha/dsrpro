'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

const IDLE_TIME = 30 * 60 * 1000 // 30 minutes
const WARNING_TIME = 5 * 60 * 1000 // 5 minutes before logout

export function useSessionManager() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningRef = useRef<NodeJS.Timeout>()

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Best effort — still clear client session
    }
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    toast.error('Session expired. Please login again.')
    router.push('/auth/signin')
  }

  const showWarning = () => {
    toast('Session will expire in 5 minutes', {
      duration: 5000,
      icon: '⚠️'
    })
  }

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    
    warningRef.current = setTimeout(showWarning, IDLE_TIME - WARNING_TIME)
    timeoutRef.current = setTimeout(logout, IDLE_TIME)
  }

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    const resetTimerHandler = () => resetTimer()
    
    events.forEach(event => {
      document.addEventListener(event, resetTimerHandler, true)
    })

    resetTimer()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimerHandler, true)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
    }
  }, [])

  return { resetTimer }
}