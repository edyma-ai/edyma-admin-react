import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

const ALIGNMENTS = {
  center: 'items-center justify-center p-4',
  right: 'justify-end',
  left: 'justify-start',
} as const

interface OverlayProps {
  open: boolean
  onClose: () => void
  /** Panel alignment: center (Modal) or a screen edge (Drawer, mobile sidebar). */
  align: keyof typeof ALIGNMENTS
  labelledBy?: string
  /** Accessible dialog name when no visible heading exists to point labelledBy at. */
  label?: string
  /** Sizing and chrome for the focusable dialog panel itself. */
  panelClassName?: string
  children: ReactNode
}

/** Open overlays, bottom to top — Escape only ever closes the topmost so a nested confirm never takes its parent down with it. */
const overlayStack: symbol[] = []

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Shared scrim + portal + escape/backdrop dismissal + focus trap/restore for Modal and Drawer. */
export function Overlay({ open, onClose, align, labelledBy, label, panelClassName, children }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusTo = useRef<HTMLElement | null>(null)

  // Consumers pass inline closures — a ref keeps the mount effect from re-running (and re-stealing focus) every render.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const token = Symbol('overlay')
    overlayStack.push(token)

    restoreFocusTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && overlayStack[overlayStack.length - 1] === token) onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      overlayStack.splice(overlayStack.indexOf(token), 1)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      restoreFocusTo.current?.focus()
    }
  }, [open])

  // Minimal trap: Tab from the last focusable (or Shift-Tab from the first/panel) cycles within the panel.
  function trapTab(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className={cn('fixed inset-0 z-50 flex bg-black/40 backdrop-blur-[2px]', ALIGNMENTS[align])}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        tabIndex={-1}
        onKeyDown={trapTab}
        className={cn('focus:outline-none', panelClassName)}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
