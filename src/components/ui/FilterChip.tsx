import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FilterChipProps {
  active?: boolean
  onClick: () => void
  count?: number
  className?: string
  children: ReactNode
}

export function FilterChip({ active = false, onClick, count, className, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors',
        active
          ? 'border-sky bg-sky-soft text-sky-deep dark:text-sky'
          : 'border-hairline bg-surface text-muted hover:border-sky/40 hover:text-ink',
        className,
      )}
    >
      {children}
      {count != null ? <span className="font-mono text-[11px] opacity-80">{count}</span> : null}
    </button>
  )
}

export function FilterChipRow({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
}
