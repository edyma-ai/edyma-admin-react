import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface Option {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  options: Option[]
  placeholder?: string
}

export function Select({ label, error, options, className, id, placeholder, ...props }: SelectProps) {
  const selectId = id ?? props.name
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-brand-slate">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={cn(
          'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-brand-slate shadow-sm outline-none',
          'focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30',
          error && 'border-error',
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
    </div>
  )
}
