import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem {
  value: string
  label: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  tabs: TabItem[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const enabled = tabs.filter((tab) => !tab.disabled)
    const current = enabled.findIndex((tab) => tab.value === value)
    const step = event.key === 'ArrowRight' ? 1 : -1
    const next = enabled[(current + step + enabled.length) % enabled.length]
    if (!next) return
    onChange(next.value)
    listRef.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn('flex items-center gap-1 border-b border-hairline', className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            data-value={tab.value}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.value)}
            className={cn(
              'focus-ring -mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors',
              active ? 'border-sky text-ink' : 'border-transparent text-muted hover:text-ink',
              tab.disabled && 'pointer-events-none opacity-55',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
