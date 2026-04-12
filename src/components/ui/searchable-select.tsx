'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  )

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 0)

    const onDocMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onEscape)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'form-input w-full text-left flex items-start gap-2 cursor-pointer min-h-[2.5rem] py-2',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <span className={cn('flex-1', !selectedOption && 'text-gray-400 dark:text-gray-500')}>
          {selectedOption?.label ? (
            <div className="whitespace-pre-line text-sm leading-tight">
              {selectedOption.label}
            </div>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform mt-1', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-[70] mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="form-input py-2"
              placeholder="Search..."
            />
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No results found</div>
            ) : (
              filteredOptions.map((opt) => {
                const selected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full px-3 py-3 text-sm text-left flex items-start justify-between gap-2',
                      'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                      selected && 'text-primary'
                    )}
                  >
                    <div className="whitespace-pre-line leading-tight flex-1">{opt.label}</div>
                    {selected && <Check className="h-4 w-4 shrink-0 mt-0.5" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
