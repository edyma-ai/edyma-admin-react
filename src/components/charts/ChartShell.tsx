import type { ReactElement, ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/cn'

export interface ChartShellProps {
  height?: number
  /** Renders a quiet empty state instead of an empty plot. */
  empty: boolean
  emptyLabel?: string
  /** Series legend row (only rendered for multi-series charts). */
  legend?: ReactNode
  className?: string
  children: ReactElement
}

export function ChartShell({ height = 240, empty, emptyLabel = 'No data for this range', legend, className, children }: ChartShellProps) {
  if (empty) {
    return (
      <div
        style={{ height }}
        className={cn('flex items-center justify-center rounded-control border border-dashed border-hairline text-[13px] text-muted', className)}
      >
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {legend}
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
