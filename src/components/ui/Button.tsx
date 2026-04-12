import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

const variants = {
  primary: 'bg-brand-slate text-white hover:bg-slate-800 shadow-sm',
  secondary: 'bg-brand-sky text-brand-slate hover:bg-sky-300',
  outline: 'border border-border bg-white text-brand-slate hover:bg-slate-50',
  danger: 'bg-error text-white hover:bg-red-700',
  ghost: 'text-muted hover:bg-slate-100',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-sm font-semibold rounded-lg',
  lg: 'px-5 py-2.5 text-base font-semibold rounded-lg',
} as const

type Variant = keyof typeof variants
type Size = keyof typeof sizes

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
