import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface AiWorkingCardProps {
  title: string
  message?: string | null
  /** Optional determinate progress (e.g. paper-extraction pages). */
  done?: number | null
  total?: number | null
  className?: string
}

/** AI-violet working state for long generation calls — the desktop cousin of the app's AIProgress. */
export function AiWorkingCard({ title, message, done, total, className }: AiWorkingCardProps) {
  const determinate = done != null && total != null && total > 0
  return (
    <div className={cn('flex items-center gap-4 rounded-card border border-ai/25 bg-ai-soft px-5 py-4', className)} role="status" aria-live="polite">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ai/15 text-ai">
        <Sparkles aria-hidden className="h-5 w-5 animate-pulse" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ai">{title}</p>
        {message ? <p className="mt-0.5 text-[13px] text-muted">{message}</p> : null}
        {determinate ? (
          <div className="mt-2 flex items-center gap-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ai/15">
              <div className="h-full rounded-full bg-ai transition-all duration-300" style={{ width: `${Math.round((done / total) * 100)}%` }} />
            </div>
            <span className="font-mono text-xs text-muted">
              {done}/{total}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
