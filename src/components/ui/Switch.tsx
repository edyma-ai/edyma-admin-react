import { useId } from 'react'
import { cn } from '@/lib/cn'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'focus-ring relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-sky' : 'bg-hairline',
          disabled && 'pointer-events-none opacity-55',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-4',
          )}
        />
      </button>
      {label || description ? (
        <label htmlFor={id} className={cn('flex cursor-pointer flex-col gap-0.5', disabled && 'cursor-not-allowed')}>
          {label ? <span className="text-[13px] font-medium text-ink">{label}</span> : null}
          {description ? <span className="text-xs text-muted">{description}</span> : null}
        </label>
      ) : null}
    </div>
  )
}
