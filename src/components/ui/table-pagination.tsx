'use client'

interface TablePaginationProps {
  totalItems: number
  currentPage: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (items: number) => void
  className?: string
}

export function getPaginatedSlice<T>(items: T[], currentPage: number, itemsPerPage: number): T[] {
  if (itemsPerPage === -1) return items
  const start = (currentPage - 1) * itemsPerPage
  return items.slice(start, start + itemsPerPage)
}

export function getTotalPages(totalItems: number, itemsPerPage: number): number {
  if (itemsPerPage === -1) return 1
  return Math.max(1, Math.ceil(totalItems / itemsPerPage))
}

export function TablePagination({
  totalItems,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = '',
}: TablePaginationProps) {
  if (totalItems <= 0) return null

  const totalPages = getTotalPages(totalItems, itemsPerPage)
  const clampedPage = Math.min(Math.max(1, currentPage), totalPages)
  const isAll = itemsPerPage === -1

  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)

    if (clampedPage <= 4) return [1, 2, 3, 4, 5]
    if (clampedPage >= totalPages - 3) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }

    return [clampedPage - 2, clampedPage - 1, clampedPage, clampedPage + 1, clampedPage + 2]
  })()

  return (
    <div className={`border-t border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-5 ${className}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isAll
              ? `Showing all ${totalItems} items`
              : `Showing page ${clampedPage} of ${totalPages} (${totalItems} items)`}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="text-sm text-gray-500 dark:text-gray-400" htmlFor="items-per-page">
              Items per page:
            </label>
            <div className="relative w-full sm:w-32">
              <select
                id="items-per-page"
                value={itemsPerPage === -1 ? 'all' : String(itemsPerPage)}
                onChange={(event) => {
                  const value = event.target.value
                  onItemsPerPageChange(value === 'all' ? -1 : Number(value))
                  onPageChange(1)
                }}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>

        {totalPages > 1 && !isAll && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start lg:justify-end">
            <button
              onClick={() => onPageChange(Math.max(1, clampedPage - 1))}
              disabled={clampedPage === 1}
              className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 sm:w-auto sm:py-1.5"
            >
              Previous
            </button>

            <div className="flex flex-wrap items-center gap-1">
              {pageNumbers[0] > 1 && (
                <>
                  <button
                    onClick={() => onPageChange(1)}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    1
                  </button>
                  {pageNumbers[0] > 2 && <span className="px-1 text-gray-400">...</span>}
                </>
              )}

              {pageNumbers.map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    clampedPage === pageNum
                      ? 'bg-primary text-white'
                      : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                    <span className="px-1 text-gray-400">...</span>
                  )}
                  <button
                    onClick={() => onPageChange(totalPages)}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => onPageChange(Math.min(totalPages, clampedPage + 1))}
              disabled={clampedPage === totalPages}
              className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 sm:w-auto sm:py-1.5"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
