'use client'
import { useState } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { useLanguage } from './LanguageProvider'

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'العربية', flag: '🇦🇪' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
]

export default function LanguageDropdown() {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  
  const currentLang = languages.find(lang => lang.code === language) || languages[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-card bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm">{currentLang.flag} {currentLang.name}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-card shadow-lg border border-border dark:border-border-dark z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code as any)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-card last:rounded-b-card ${
                language === lang.code ? 'bg-primary/10 text-primary' : ''
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>{lang.flag}</span>
                <span className="text-sm">{lang.name}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}