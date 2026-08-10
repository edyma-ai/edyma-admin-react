interface TooltipEntry {
  name?: string | number
  value?: string | number
  color?: string
  fill?: string
}

export interface ChartTooltipContentProps {
  active?: boolean
  label?: string | number
  payload?: TooltipEntry[]
  valueFormatter?: (value: number) => string
}

/** Shared tooltip body — surface chrome from tokens, mono values. */
export function ChartTooltipContent({ active, label, payload, valueFormatter }: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="min-w-32 rounded-control border border-hairline bg-elevated px-3 py-2 shadow-pop">
      {label != null && label !== '' ? <p className="mb-1 font-mono text-[11px] font-medium text-muted">{label}</p> : null}
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => {
          const numeric = typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0)
          return (
            <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? entry.fill }} />
                {entry.name}
              </span>
              <span className="font-mono text-xs font-semibold text-ink">
                {valueFormatter ? valueFormatter(numeric) : numeric.toLocaleString('en-IN')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
