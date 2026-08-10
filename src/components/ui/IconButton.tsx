import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type IconButtonVariant = 'ghost' | 'secondary' | 'danger'
type IconButtonSize = 'sm' | 'md'

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'text-muted hover:bg-ink/5 hover:text-ink dark:hover:bg-white/5',
  secondary: 'border border-hairline bg-surface text-muted hover:border-sky/40 hover:text-ink',
  danger: 'text-danger hover:bg-danger-soft',
}

const SIZES: Record<IconButtonSize, string> = {
  sm: 'h-7 w-7 [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-9 w-9 [&_svg]:h-[18px] [&_svg]:w-[18px]',
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — icon-only buttons must always announce what they do. */
  label: string
  icon: ReactNode
  variant?: IconButtonVariant
  size?: IconButtonSize
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'focus-ring inline-flex shrink-0 items-center justify-center rounded-control transition-colors',
        'disabled:pointer-events-none disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
})
