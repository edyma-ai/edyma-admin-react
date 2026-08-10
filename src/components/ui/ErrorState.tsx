import { AlertTriangle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-1 px-6 py-12 text-center', className)}>
      <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <p className="text-sm font-bold text-ink">{title}</p>
      {message ? <p className="max-w-sm text-[13px] text-muted">{message}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-3" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
