/* eslint-disable react-refresh/only-export-components -- context + provider in one module */
import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

const KIND_STYLES: Record<ToastKind, { icon: typeof CheckCircle2; accent: string }> = {
  success: { icon: CheckCircle2, accent: 'text-success' },
  error: { icon: AlertCircle, accent: 'text-danger' },
  info: { icon: Info, accent: 'text-info' },
}

/** Monotonic ids — Date.now() collides when two toasts fire in the same millisecond. */
let toastSequence = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++toastSequence
    setItems((prev) => [...prev, { id, message, kind }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((toast) => toast.id !== id))
    }, 4000)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {items.map((toast) => {
          const { icon: Icon, accent } = KIND_STYLES[toast.kind]
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-card border border-hairline bg-elevated px-4 py-3 shadow-pop"
            >
              <Icon aria-hidden className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', accent)} />
              <p className="flex-1 text-[13px] font-medium text-ink">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss"
                className="focus-ring rounded text-muted transition-colors hover:text-ink"
                onClick={() => setItems((prev) => prev.filter((item) => item.id !== toast.id))}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
