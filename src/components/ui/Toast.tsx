/* eslint-disable react-refresh/only-export-components -- context + provider in one module */
import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle, X } from 'react-feather'
import { cn } from '@/lib/cn'

type ToastKind = 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now()
    setItems((prev) => [...prev, { id, message, kind }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
              t.kind === 'success' && 'border-emerald-200 bg-white text-brand-slate',
              t.kind === 'error' && 'border-red-200 bg-white text-error',
            )}
          >
            {t.kind === 'success' ? <CheckCircle className="mt-0.5 shrink-0 text-accent-green" size={18} /> : null}
            <p className="flex-1 text-sm">{t.message}</p>
            <button
              type="button"
              className="text-muted hover:text-brand-slate"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
