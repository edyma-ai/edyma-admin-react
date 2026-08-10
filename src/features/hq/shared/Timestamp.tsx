import { cn } from '@/lib/cn'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatRelative } from '@/lib/dates'
import { formatDateTime } from '@/lib/format'

export interface TimestampProps {
  at: number | null | undefined
  className?: string
}

/** Relative ms-epoch timestamp in mono, with the absolute IST date-time on hover. */
export function Timestamp({ at, className }: TimestampProps) {
  if (!at) return <span className="text-muted">—</span>
  return (
    <Tooltip content={formatDateTime(at)}>
      <span className={cn('font-mono text-[13px]', className)}>{formatRelative(at)}</span>
    </Tooltip>
  )
}
