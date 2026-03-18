import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
      {...props}
    />
  )
}

export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("dubai-card p-6", className)}>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-600 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
        <thead className="table-header">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="table-cell">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="table-row">
              {Array.from({ length: columns }).map((_, j) => (
                <td key={j} className="table-cell">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const CHART_HEIGHTS = [70, 90, 60, 110, 80, 130, 100, 75, 95, 85, 120, 65]

export function ChartSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("dubai-card p-6", className)}>
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="h-64 flex items-end space-x-2">
        {CHART_HEIGHTS.map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}px` }} />
        ))}
      </div>
    </div>
  )
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end space-x-2 pt-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}