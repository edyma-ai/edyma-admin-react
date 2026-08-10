import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { scoreBand } from '@/lib/format'

export type BadgeTone = 'neutral' | 'sky' | 'success' | 'warning' | 'danger' | 'info' | 'ai'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink/5 text-muted dark:bg-white/10',
  sky: 'bg-sky-soft text-sky-deep dark:text-sky',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  ai: 'bg-ai-soft text-ai',
}

export interface BadgeProps {
  tone?: BadgeTone
  icon?: ReactNode
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/** Violet marker reserved exclusively for AI-generated content. */
export function AiBadge({ children = 'AI generated', className }: { children?: ReactNode; className?: string }) {
  return (
    <Badge tone="ai" icon={<Sparkles aria-hidden className="h-3 w-3" />} className={className}>
      {children}
    </Badge>
  )
}

/** Score rendered on the 4-band scale (≥80 green · ≥60 blue · ≥40 amber · <40 red); a missing score renders a neutral em dash. */
export function ScoreBadge({ score, max = 100, className }: { score?: number | null; max?: number; className?: string }) {
  if (score == null) {
    return (
      <Badge tone="neutral" className={cn('font-mono', className)}>
        —
      </Badge>
    )
  }
  const percent = max === 100 ? score : (score / max) * 100
  return (
    <Badge tone={scoreBand(percent)} className={cn('font-mono', className)}>
      {Math.round(score)}
      {max !== 100 ? `/${max}` : '%'}
    </Badge>
  )
}
