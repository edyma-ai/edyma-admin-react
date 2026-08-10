/** Formatting helpers — all numerals render in mono via the components that call these. */

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const COMPACT = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })
const PLAIN = new Intl.NumberFormat('en-IN')

const IST_DATE = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
const IST_DATE_TIME = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatNumber(value: number): string {
  return PLAIN.format(value)
}

export function formatCompact(value: number): string {
  return COMPACT.format(value)
}

export function formatInr(value: number): string {
  return INR.format(value)
}

export function formatUsd(value: number): string {
  return USD.format(value)
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`
}

/** ms-epoch → date in IST (the product's home timezone). */
export function formatDate(msEpoch: number): string {
  return IST_DATE.format(new Date(msEpoch))
}

/** ms-epoch → date + time in IST. */
export function formatDateTime(msEpoch: number): string {
  return IST_DATE_TIME.format(new Date(msEpoch))
}

/** Minutes → "3h 24m" / "45m". */
export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes)
  if (rounded < 60) return `${rounded}m`
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/** The 4-band score scale used everywhere a score renders. */
export type ScoreBand = 'success' | 'info' | 'warning' | 'danger'

export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return 'success'
  if (score >= 60) return 'info'
  if (score >= 40) return 'warning'
  return 'danger'
}
