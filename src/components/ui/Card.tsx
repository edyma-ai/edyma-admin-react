import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean
}

export function Card({ padded = true, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-card border border-hairline bg-surface shadow-card', padded && 'p-5', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export interface SectionCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Set false when the body manages its own padding (e.g. a DataTable). */
  padded?: boolean
}

export function SectionCard({ title, description, actions, padded = true, className, children, ...props }: SectionCardProps) {
  return (
    <Card padded={false} className={className} {...props}>
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className={cn('pt-4', padded && 'px-5 pb-5')}>{children}</div>
    </Card>
  )
}
