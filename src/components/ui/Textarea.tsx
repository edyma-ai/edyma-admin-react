import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const tid = id ?? props.name
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={tid} className="mb-1.5 block text-sm font-medium text-brand-slate">
          {label}
        </label>
      ) : null}
      <textarea
        id={tid}
        className={cn(
          'min-h-[100px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-brand-slate shadow-sm outline-none',
          'focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30',
          error && 'border-error',
          className,
        )}
        {...props}
      />
      {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
    </div>
  )
}
