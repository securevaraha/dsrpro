'use client'
import { useEffect, useRef } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'

export interface FilterField {
  key: string
  label: string
  type: 'text' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
}

interface FilterPanelProps {
  open: boolean
  onClose: () => void
  fields: FilterField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset: () => void
  activeCount: number
}

export function FilterPanel({ open, onClose, fields, values, onChange, onReset, activeCount }: FilterPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end sm:pt-16 sm:pr-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full sm:w-80 bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom sm:slide-in-from-top duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Filters</span>
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-bold rounded-full bg-primary text-white">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={onReset}
                className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                Reset all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  className="form-select text-sm"
                  value={values[field.key] ?? 'all'}
                  onChange={(e) => onChange(field.key, e.target.value)}
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-input text-sm"
                  placeholder={field.placeholder || `Filter by ${field.label.toLowerCase()}...`}
                  value={values[field.key] ?? ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="dubai-button w-full justify-center text-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}

interface FilterButtonProps {
  onClick: () => void
  activeCount: number
}

export function FilterButton({ onClick, activeCount }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all duration-150
        ${activeCount > 0
          ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
        }`}
    >
      <SlidersHorizontal className="h-4 w-4" />
      <span>Filter</span>
      {activeCount > 0 && (
        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-bold rounded-full bg-primary text-white">
          {activeCount}
        </span>
      )}
    </button>
  )
}
