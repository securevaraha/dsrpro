'use client'

import { DatePicker } from '@/components/ui/date-picker'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DATE_RANGE_OPTIONS, type DateRangeKey } from '@/lib/date-range'

interface DateRangeFilterProps {
  value: string
  startDate: string
  endDate: string
  onChange: (value: string) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  options?: Array<{ value: string; label: string }>
  className?: string
}

export function DateRangeFilter({
  value,
  startDate,
  endDate,
  onChange,
  onStartDateChange,
  onEndDateChange,
  options,
  className = ''
}: DateRangeFilterProps) {
  const selectOptions = options || DATE_RANGE_OPTIONS
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={selectOptions}
        placeholder="Date Range"
      />
      {value === 'custom' && (
        <div className="flex gap-2">
          <DatePicker placeholder="Start Date" value={startDate} onChange={onStartDateChange} />
          <DatePicker placeholder="End Date" value={endDate} onChange={onEndDateChange} />
        </div>
      )}
    </div>
  )
}