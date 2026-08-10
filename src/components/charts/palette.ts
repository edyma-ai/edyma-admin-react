import type { ScoreBand } from '@/lib/format'

/**
 * Charts never hardcode hex — they read the token layer, so Lumen/Eclipse each
 * resolve to their own CVD-validated steps (see theme/tokens.css).
 */
export function chartColor(index: number): string {
  return `var(--chart-${(index % 10) + 1})`
}

/** Deterministic color for a subject/series by its position — never re-ranked by filters. */
export const subjectPalette = Array.from({ length: 10 }, (_, index) => chartColor(index))

export const bandColor: Record<ScoreBand, string> = {
  success: 'var(--success)',
  info: 'var(--info)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
}

/** Calm motion — no bounce, one beat. */
export const CHART_ANIMATION_MS = 200

export const axisTickStyle = {
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  fill: 'var(--muted)',
} as const

export const gridStroke = 'var(--hairline)'
