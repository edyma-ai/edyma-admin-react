import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export interface StatDelta {
  /** Pre-formatted delta, e.g. "+12%" or "-3". */
  value: string
  direction: 'up' | 'down' | 'flat'
  /** Whether this movement is good news — drives the chip color. Defaults to up = good. */
  positive?: boolean
}

export interface StatTileProps {
  label: string
  /** Pre-formatted value (use lib/format) — rendered in mono. */
  value: ReactNode
  delta?: StatDelta
  hint?: string
  icon?: ReactNode
  /** Slot for a small chart (e.g. a Sparkline) rendered under the value. */
  sparkline?: ReactNode
  loading?: boolean
  className?: string
}

const DELTA_ICONS = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
} as const

export function StatTile({ label, value, delta, hint, icon, sparkline, loading, className }: StatTileProps) {
  const isPositive = delta ? (delta.positive ?? delta.direction === 'up') : false
  const DeltaIcon = delta ? DELTA_ICONS[delta.direction] : null

  return (
    <Card className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {icon ? <span className="text-muted [&_svg]:h-4 [&_svg]:w-4">{icon}</span> : null}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-mono text-[26px] font-semibold leading-8 tracking-tight text-ink">{value}</span>
          {delta && DeltaIcon ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-semibold',
                delta.direction === 'flat' ? 'bg-ink/5 text-muted dark:bg-white/10' : isPositive ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
              )}
            >
              <DeltaIcon aria-hidden className="h-3 w-3" />
              {delta.value}
            </span>
          ) : null}
        </div>
      )}
      {sparkline}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </Card>
  )
}
