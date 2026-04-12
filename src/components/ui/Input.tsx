import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-brand-slate">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-brand-slate shadow-sm outline-none transition-colors',
          'placeholder:text-slate-400 focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30',
          error && 'border-error',
          className,
        )}
        {...props}
      />
      {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
    </div>
  )
}
