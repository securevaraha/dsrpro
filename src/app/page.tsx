'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to sign-in page immediately
    router.replace('/auth/signin')
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-dubai-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">DSR</span>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting to sign in...</p>
      </div>
    </div>
  )
}
