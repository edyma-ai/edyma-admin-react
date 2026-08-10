/* eslint-disable react-refresh/only-export-components -- field chrome shared by every control */
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Shared chrome for every text-like control (Input, Select, Textarea). */
export function fieldChrome(error?: boolean) {
  return cn(
    'w-full rounded-control border bg-surface text-sm text-ink transition-colors',
    'placeholder:text-muted/60 focus-ring disabled:pointer-events-none disabled:opacity-55',
    error ? 'border-danger' : 'border-hairline hover:border-sky/40',
  )
}

export interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  /** Render prop receives the ids to wire the control for a11y. */
  children: (control: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="text-[13px] font-semibold text-ink">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}
      {children({ id, describedBy: message ? messageId : undefined, invalid: Boolean(error) })}
      {message ? (
        <p id={messageId} className={cn('text-xs', error ? 'font-medium text-danger' : 'text-muted')}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
