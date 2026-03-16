'use client'
import { AlertTriangle, Trash2, X, UserX } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  confirmButtonClass?: string
  type?: 'delete' | 'terminate' | 'warning'
  icon?: React.ReactNode
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
  type = 'delete',
  icon
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const getIcon = () => {
    if (icon) return icon
    
    switch (type) {
      case 'delete':
        return <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
      case 'terminate':
        return <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      default:
        return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
    }
  }

  const getIconBg = () => {
    switch (type) {
      case 'delete':
      case 'terminate':
        return 'bg-red-100 dark:bg-red-900/30'
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-900/30'
      default:
        return 'bg-red-100 dark:bg-red-900/30'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${getIconBg()}`}>
            {getIcon()}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}