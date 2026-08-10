import type { ComponentType, ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-1 px-6 py-12 text-center', className)}>
      <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-soft text-sky">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-bold text-ink">{title}</p>
      {description ? <p className="max-w-sm text-[13px] text-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
