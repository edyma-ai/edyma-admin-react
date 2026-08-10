import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface StepperStep {
  label: string
}

export interface StepperProps {
  steps: StepperStep[]
  /** Zero-based index of the active step. */
  current: number
  /** Completed steps become clickable when provided (wizard back-navigation). */
  onStepSelect?: (index: number) => void
  className?: string
}

/** Horizontal wizard progress: numbered markers, check on completion, connectors that fill as you advance. */
export function Stepper({ steps, current, onStepSelect, className }: StepperProps) {
  return (
    <ol className={cn('flex items-center gap-2.5', className)}>
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        const clickable = done && Boolean(onStepSelect)

        const content = (
          <>
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold transition-colors',
                done ? 'border-sky bg-sky text-white' : active ? 'border-sky bg-sky-soft text-sky-deep dark:text-sky' : 'border-hairline text-muted',
              )}
            >
              {done ? <Check aria-hidden className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className={cn('whitespace-nowrap text-[13px] font-semibold', active ? 'text-ink' : 'text-muted')}>{step.label}</span>
          </>
        )

        return (
          <li key={step.label} className={cn('flex min-w-0 items-center gap-2.5', index > 0 && 'flex-1')}>
            {index > 0 ? <span aria-hidden className={cn('h-px min-w-4 flex-1', done || active ? 'bg-sky' : 'bg-hairline')} /> : null}
            {clickable ? (
              <button type="button" onClick={() => onStepSelect?.(index)} className="focus-ring flex items-center gap-2.5 rounded-control transition-opacity hover:opacity-80">
                {content}
              </button>
            ) : (
              <span aria-current={active ? 'step' : undefined} className="flex items-center gap-2.5">
                {content}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
