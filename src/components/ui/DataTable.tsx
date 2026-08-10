import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from '@/components/ui/IconButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

export interface Column<Row> {
  key: string
  header: ReactNode
  render: (row: Row) => ReactNode
  /** Enables sorting on this column. */
  sortValue?: (row: Row) => string | number | null | undefined
  align?: 'left' | 'right' | 'center'
  /** Numerals/ids — renders the cell in mono. */
  mono?: boolean
  width?: string
}

interface SortState {
  key: string
  direction: 'asc' | 'desc'
}

/** Server-driven pagination — `rows` are already the current page; the table only renders the pager. */
export interface ServerPagination {
  /** 1-based current page. */
  page: number
  pageSize: number
  /** Total row count when the endpoint reports one (X-Total-Count). */
  total?: number | null
  /** Fallback when total is unknown — whether a next page exists (defaults to "a full page came back"). */
  hasMore?: boolean
  onPageChange: (page: number) => void
}

export interface DataTableProps<Row> {
  columns: Column<Row>[]
  rows: Row[]
  rowKey: (row: Row) => string
  loading?: boolean
  /** Stale rows shown while a filter/search refetch is in flight (keepPreviousData) — dims them instead of swapping to skeletons. */
  refreshing?: boolean
  error?: string | null
  onRetry?: () => void
  emptyState?: ReactNode
  onRowClick?: (row: Row) => void
  /** Enables client-side pagination. Ignored when serverPagination is set. */
  pageSize?: number
  /** Server mode: the caller owns page state and passes one page of rows; sorting still applies within the page. */
  serverPagination?: ServerPagination
  /** Snaps back to page 1 whenever this changes — pass the search/filter state that reshapes the row set. Client mode only. */
  pageResetKey?: string | number
  initialSort?: SortState
  skeletonRows?: number
  /** Constrains height so the sticky header earns its keep, e.g. 'max-h-[32rem]'. */
  maxHeightClassName?: string
  className?: string
}

const ALIGN: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  loading = false,
  refreshing = false,
  error = null,
  onRetry,
  emptyState,
  onRowClick,
  pageSize,
  serverPagination,
  pageResetKey,
  initialSort,
  skeletonRows = 6,
  maxHeightClassName,
  className,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null)
  const [page, setPage] = useState(0)

  // Filter/search changes reshape the row set — snap back to page 1 so the user isn't stranded.
  const [prevResetKey, setPrevResetKey] = useState(pageResetKey)
  if (pageResetKey !== prevResetKey) {
    setPrevResetKey(pageResetKey)
    setPage(0)
  }

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((col) => col.key === sort.key)
    if (!column?.sortValue) return rows
    const { sortValue } = column
    const factor = sort.direction === 'asc' ? 1 : -1
    // Empty values stay last in both directions — only real values follow the sort direction.
    return [...rows].sort((a, b) => {
      const left = sortValue(a)
      const right = sortValue(b)
      if (left == null && right == null) return 0
      if (left == null) return 1
      if (right == null) return -1
      return factor * compareValues(left, right)
    })
  }, [rows, sort, columns])

  const clientPageSize = serverPagination ? undefined : pageSize
  const pageCount = clientPageSize ? Math.max(1, Math.ceil(sortedRows.length / clientPageSize)) : 1
  const currentPage = Math.min(page, pageCount - 1)
  const visibleRows = clientPageSize ? sortedRows.slice(currentPage * clientPageSize, (currentPage + 1) * clientPageSize) : sortedRows

  // Server mode: rows are already one page; range/total come from the caller, "next" falls back to a full-page heuristic.
  const serverStart = serverPagination ? (serverPagination.page - 1) * serverPagination.pageSize : 0
  const serverEnd = serverStart + rows.length
  const serverHasNext = serverPagination
    ? serverPagination.total != null
      ? serverEnd < serverPagination.total
      : (serverPagination.hasMore ?? rows.length === serverPagination.pageSize)
    : false

  function toggleSort(key: string) {
    setPage(0)
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: 'asc' }
      return prev.direction === 'asc' ? { key, direction: 'desc' } : null
    })
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: Row) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick?.(row)
    }
  }

  const showBody = !error && !loading
  const isEmpty = showBody && sortedRows.length === 0

  return (
    <div className={cn('overflow-hidden rounded-card border border-hairline bg-surface shadow-card', className)}>
      <div className={cn('overflow-auto', maxHeightClassName)}>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {columns.map((column) => {
                const sortable = Boolean(column.sortValue)
                const active = sort?.key === column.key
                const SortIcon = active ? (sort?.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    aria-sort={active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'sticky top-0 z-10 border-b border-hairline bg-surface px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted',
                      ALIGN[column.align ?? 'left'],
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          'focus-ring inline-flex items-center gap-1 rounded uppercase tracking-wide transition-colors hover:text-ink',
                          active && 'text-ink',
                        )}
                      >
                        {column.header}
                        <SortIcon aria-hidden className={cn('h-3 w-3', !active && 'opacity-50')} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody aria-busy={refreshing || undefined} className={cn('transition-opacity', refreshing && 'opacity-55')}>
            {loading
              ? Array.from({ length: skeletonRows }, (_, index) => (
                  <tr key={index} className="border-b border-hairline last:border-b-0">
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-32" />
                      </td>
                    ))}
                  </tr>
                ))
              : visibleRows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={onRowClick ? (event) => onRowKeyDown(event, row) : undefined}
                    className={cn(
                      'border-b border-hairline last:border-b-0',
                      onRowClick && 'focus-ring cursor-pointer transition-colors hover:bg-sky-soft/50 dark:hover:bg-sky-soft/40',
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn('px-4 py-3 text-ink', ALIGN[column.align ?? 'left'], column.mono && 'font-mono')}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {error ? <ErrorState message={error} onRetry={onRetry} /> : null}
        {isEmpty ? (emptyState ?? <EmptyState title="Nothing here yet" />) : null}
      </div>
      {serverPagination && (serverPagination.page > 1 || serverHasNext) ? (
        <div className="flex items-center justify-between border-t border-hairline px-4 py-2.5">
          <p className="font-mono text-xs text-muted">
            {rows.length === 0 ? 0 : serverStart + 1}–{serverEnd}
            {serverPagination.total != null ? ` of ${serverPagination.total}` : ''}
          </p>
          <div className="flex items-center gap-1">
            <IconButton
              label="Previous page"
              size="sm"
              icon={<ChevronLeft />}
              disabled={serverPagination.page <= 1}
              onClick={() => serverPagination.onPageChange(serverPagination.page - 1)}
            />
            <IconButton
              label="Next page"
              size="sm"
              icon={<ChevronRight />}
              disabled={!serverHasNext}
              onClick={() => serverPagination.onPageChange(serverPagination.page + 1)}
            />
          </div>
        </div>
      ) : clientPageSize && sortedRows.length > clientPageSize ? (
        <div className="flex items-center justify-between border-t border-hairline px-4 py-2.5">
          <p className="font-mono text-xs text-muted">
            {currentPage * clientPageSize + 1}–{Math.min((currentPage + 1) * clientPageSize, sortedRows.length)} of {sortedRows.length}
          </p>
          <div className="flex items-center gap-1">
            <IconButton
              label="Previous page"
              size="sm"
              icon={<ChevronLeft />}
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            />
            <IconButton
              label="Next page"
              size="sm"
              icon={<ChevronRight />}
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
