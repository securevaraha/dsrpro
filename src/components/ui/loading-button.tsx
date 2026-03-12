import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingButtonProps {
  loading?: boolean
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger'
}

export function LoadingButton({
  loading = false,
  children,
  className,
  disabled,
  onClick,
  type = 'button',
  variant = 'primary'
}: LoadingButtonProps) {
  const baseClasses = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  
  const variantClasses = {
    primary: "dubai-button",
    secondary: "btn-secondary",
    danger: "bg-red-600 hover:bg-red-700 text-white"
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        variantClasses[variant],
        loading && "cursor-wait",
        className
      )}
    >
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {children}
    </button>
  )
}