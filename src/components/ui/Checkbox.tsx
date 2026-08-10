import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, ...props },
  ref,
) {
  const id = useId()
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-2.5', props.disabled && 'cursor-not-allowed opacity-55', className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="focus-ring mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-hairline bg-surface transition-colors checked:border-sky checked:bg-sky checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M3.5%208.5l3%203%206-7%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat"
        {...props}
      />
      {label || description ? (
        <span className="flex flex-col gap-0.5">
          {label ? <span className="text-[13px] font-medium text-ink">{label}</span> : null}
          {description ? <span className="text-xs text-muted">{description}</span> : null}
        </span>
      ) : null}
    </label>
  )
})
