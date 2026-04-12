import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const variants = {
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  success: 'bg-emerald-50 text-accent-green border border-emerald-200',
  warning: 'bg-amber-50 text-accent-orange border border-amber-200',
  danger: 'bg-red-50 text-error border border-red-200',
  accent: 'bg-brand-sky-light/80 text-accent-blue border border-sky-200',
} as const

type Variant = keyof typeof variants

export function Badge({ variant = 'neutral', children, className }: { variant?: Variant; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
