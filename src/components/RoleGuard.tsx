'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser, UserRole } from '@/hooks/useCurrentUser'

interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

/**
 * Client-side role guard component.
 * Redirects unauthorized users to the dashboard.
 * The API routes provide the real security; this is for UX.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.replace('/dashboard')
    }
  }, [user, loading, allowedRoles, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}
