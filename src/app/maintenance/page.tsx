'use client'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <span className="text-white font-bold text-3xl">DSR</span>
        </div>

        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-amber-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">Under Maintenance</h1>
        <p className="text-gray-400 text-lg mb-8">
          We&apos;re performing scheduled maintenance to improve your experience. We&apos;ll be back shortly.
        </p>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 inline-block">
          <div className="flex items-center gap-2 text-amber-400">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
            <span className="text-sm font-medium">Maintenance in progress</span>
          </div>
        </div>

        <p className="text-gray-500 text-sm mt-8">
          Need help? Contact us at <a href="mailto:support@dsrinfo.com" className="text-amber-500 hover:underline">support@dsrinfo.com</a>
        </p>
      </div>
    </div>
  )
}
