'use client'
import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, isValid, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isSameDay, isToday } from 'date-fns'

interface DatePickerProps {
  value: string           // yyyy-MM-dd
  onChange: (value: string) => void
  label?: string
  required?: boolean
  placeholder?: string
  className?: string
  minDate?: string
  maxDate?: string
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December']

// Parse yyyy-MM-dd as LOCAL date (avoids UTC off-by-one)
function parseLocalDate(str: string): Date | null {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return isValid(date) ? date : null
}

export function DatePicker({
  value,
  onChange,
  label,
  required,
  placeholder = 'Select date',
  className = '',
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState<Date>(() => parseLocalDate(value) ?? new Date())
  const containerRef = useRef<HTMLDivElement>(null)
  const [dropUp, setDropUp] = useState(false)

  const selected = parseLocalDate(value)
  const displayValue = selected ? format(selected, 'dd MMM yyyy') : ''

  // Sync viewDate when value changes externally
  useEffect(() => {
    const d = parseLocalDate(value)
    if (d) setViewDate(d)
  }, [value])

  // Decide drop direction and close on outside click
  useEffect(() => {
    if (!open) return

    // Check if there's enough space below
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setDropUp(spaceBelow < 340)
    }

    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)

  const isDisabled = (day: Date) => {
    if (minDate) { const mn = parseLocalDate(minDate); if (mn && day < mn) return true }
    if (maxDate) { const mx = parseLocalDate(maxDate); if (mx && day > mx) return true }
    return false
  }

  const selectDay = (day: Date) => {
    if (isDisabled(day)) return
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`
          relative flex items-center w-full px-4 py-2.5 text-sm text-left
          border rounded-xl cursor-pointer
          bg-white dark:bg-gray-800
          transition-all duration-200
          ${open
            ? 'border-primary ring-2 ring-primary/25 shadow-sm'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary/60 dark:hover:border-primary/50'
          }
        `}
      >
        <Calendar className="h-4 w-4 text-primary flex-shrink-0 mr-2.5" />
        <span className={`flex-1 ${displayValue ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
          {displayValue || placeholder}
        </span>
        {value && (
          <span
            role="button"
            onClick={clear}
            className="ml-1 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {/* Hidden input for form validation */}
      {required && (
        <input
          type="text"
          required
          value={value}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none w-full"
          tabIndex={-1}
        />
      )}

      {/* Calendar Dropdown — rendered in a portal-like fixed position */}
      {open && (
        <div
          className={`absolute ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} left-0 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden`}
          style={{ zIndex: 9999 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-dubai-gradient">
            <button
              type="button"
              onClick={() => setViewDate(d => subMonths(d, 1))}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-white tracking-wide">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(d => addMonths(d, 1))}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map(day => {
              const isSelected = selected ? isSameDay(day, selected) : false
              const disabled = isDisabled(day)
              const todayDay = isToday(day)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={`
                    h-8 w-full rounded-lg text-xs font-medium transition-all duration-150
                    ${isSelected
                      ? 'bg-primary text-white shadow-sm scale-105'
                      : todayDay
                        ? 'border border-primary/50 text-primary dark:text-primary font-semibold'
                        : disabled
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary'
                    }
                  `}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => selectDay(new Date())}
              className="w-full py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
