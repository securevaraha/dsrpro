'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export type UserRole = 'admin' | 'agent'

interface UserInfo {
  id: string
  name: string
  email: string
  role: UserRole
}

interface CurrentUserContextValue {
  user: UserInfo | null
  loading: boolean
}

const CurrentUserContext = createContext<CurrentUserContextValue>({ user: null, loading: true })

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setUser(data.user) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <CurrentUserContext.Provider value={{ user, loading }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  return useContext(CurrentUserContext)
}
