/** Compact inline stat for widget bodies and drawers — smaller than a StatTile, still mono. */
export function MiniStat({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="rounded-control border border-hairline px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-semibold leading-6 text-ink">{value}</p>
      {caption ? <p className="text-[11px] text-muted">{caption}</p> : null}
    </div>
  )
}
