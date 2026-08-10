import { type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatTile } from '@/components/ui/StatTile'
import type { WidgetQuery } from '@/features/hq/shared/Widget'

export interface KpiTileProps<T> {
  label: string
  query: WidgetQuery<T>
  value: (data: T) => ReactNode
  hint?: (data: T) => string
}

/** StatTile bound to one query — shimmer while pending, compact retry on failure. */
export function KpiTile<T>({ label, query, value, hint }: KpiTileProps<T>) {
  if (query.isError) {
    return (
      <Card className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="text-[13px] font-medium text-danger">Couldn’t load</p>
        <Button variant="ghost" size="sm" className="-ml-2 self-start" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={query.refetch}>
          Retry
        </Button>
      </Card>
    )
  }
  return (
    <StatTile
      label={label}
      loading={query.isPending}
      value={query.data !== undefined ? value(query.data) : '—'}
      hint={query.data !== undefined ? hint?.(query.data) : undefined}
    />
  )
}
