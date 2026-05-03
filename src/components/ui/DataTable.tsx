import { useState, useMemo, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface Column<T> {
  key: string
  header: string
  className?: string
  render?: (row: T) => ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number
}

type SortDir = 'asc' | 'desc'

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  emptyMessage?: string
  loading?: boolean
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No data',
  loading,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(col: Column<T>) {
    if (!col.sortable) return
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(col.key)
      setSortDir('asc')
    }
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortable) return rows
    const getValue = col.sortValue ?? ((row: T) => {
      const v = (row as Record<string, unknown>)[col.key]
      return v == null ? '' : typeof v === 'number' ? v : String(v)
    })
    return [...rows].sort((a, b) => {
      const va = getValue(a)
      const vb = getValue(b)
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir, columns])

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80">
              {columns.map((c) => (
                <th key={c.key} className={cn('px-4 py-3 font-semibold text-brand-slate', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border-light last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3', c.className)}>
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-border bg-white p-12 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50/80">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'px-4 py-3 font-semibold text-brand-slate',
                  c.sortable && 'cursor-pointer select-none hover:text-accent-blue',
                  c.className,
                )}
                onClick={() => handleSort(c)}
              >
                <span className="inline-flex items-center gap-1">
                  {c.header}
                  {c.sortable ? (
                    <span className="text-[10px] leading-none text-muted">
                      {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  ) : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                'border-b border-border-light last:border-0',
                onRowClick && 'cursor-pointer hover:bg-slate-50/80 transition-colors',
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3 text-brand-slate', c.className)}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
