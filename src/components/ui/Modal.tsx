import type { ReactNode } from 'react'
import { X } from 'react-feather'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-brand-slate/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${widths[size]} rounded-xl border border-border bg-white p-6 shadow-xl`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-brand-slate">{title}</h2>
          <Button variant="ghost" size="sm" className="!p-1" onClick={onClose} aria-label="Close">
            <X size={20} />
          </Button>
        </div>
        <div className="text-sm text-brand-slate">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2 border-t border-border-light pt-4">{footer}</div> : null}
      </div>
    </div>
  )
}
