export type DateRangeKey = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface DateRangeBounds {
  start?: Date
  end?: Date
}

export const DATE_RANGE_OPTIONS: Array<{ value: DateRangeKey; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'Monthly Report' },
  { value: 'year', label: 'Yearly Report' },
  { value: 'custom', label: 'Custom Range' },
]

export function toTitleCase(value: string): string {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[A-Z0-9]{2,}$/.test(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

export function getDateRangeBounds(range: string, startDate?: string, endDate?: string, now = new Date()): DateRangeBounds {
  switch (range) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      return { start, end }
    }
    case 'week': {
      const start = new Date(now)
      start.setDate(start.getDate() - start.getDay())
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return { start, end }
    }
    case 'year':
      return {
        start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      }
    case 'custom': {
      if (!startDate || !endDate) return {}
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return {}
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    default:
      return {}
  }
}

export function matchesDateRange(dateValue: string | Date | undefined | null, range: string, startDate?: string, endDate?: string): boolean {
  if (!dateValue) return true
  if (!range || range === 'all') return true
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return true

  const bounds = getDateRangeBounds(range, startDate, endDate)
  if (!bounds.start || !bounds.end) return true
  return date >= bounds.start && date <= bounds.end
}

export function getDateRangeLabel(range: string, startDate?: string, endDate?: string, now = new Date()): string {
  switch (range) {
    case 'today':
      return 'Today'
    case 'week':
      return 'This Week'
    case 'month':
      return 'Monthly Report'
    case 'year':
      return 'Yearly Report'
    case 'custom':
      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
          const formatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          return `${formatter.format(start)} To ${formatter.format(end)}`
        }
      }
      return 'Custom Range'
    default:
      return toTitleCase(range || 'Today')
  }
}

export function getReportHeading(reportType: string, agentLabel: string, dateRangeLabel: string): string {
  return `${toTitleCase(reportType)} - ${toTitleCase(agentLabel)} - ${toTitleCase(dateRangeLabel)}`
}