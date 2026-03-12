'use client'
import { useState, useEffect } from 'react'

export type UserRole = 'admin' | 'agent'

interface UserInfo {
  id: string
  name: string
  email: string
  role: UserRole
}

/**
 * Hook to get the current user's info from the server.
 * Fetches once on mount and caches in state.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } catch {
        // Failed to fetch user — will be null
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  return { user, loading }
}
