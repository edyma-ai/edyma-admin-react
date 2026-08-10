import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TooltipProps {
  content: ReactNode
  side?: 'top' | 'right' | 'bottom'
  className?: string
  children: ReactNode
}

const SIDES = {
  top: 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
  right: 'left-full top-1/2 ml-1.5 -translate-y-1/2',
  bottom: 'top-full left-1/2 mt-1.5 -translate-x-1/2',
} as const

/** Lightweight hover/focus tooltip — shows on hover and keyboard focus alike. */
export function Tooltip({ content, side = 'top', className, children }: TooltipProps) {
  const id = useId()

  return (
    <span className={cn('group/tooltip relative inline-flex', className)} aria-describedby={id}>
      {children}
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-medium text-canvas opacity-0 shadow-pop transition-opacity duration-150',
          'group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
          SIDES[side],
        )}
      >
        {content}
      </span>
    </span>
  )
}
