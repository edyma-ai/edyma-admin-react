import { formatDate } from '@/lib/format'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** ms-epoch → compact relative time ("just now", "4h ago"); older than a month falls back to the IST date. */
export function formatRelative(msEpoch: number, now: number = Date.now()): string {
  const elapsed = now - msEpoch
  if (elapsed < MINUTE_MS) return 'just now'
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`
  if (elapsed < 30 * DAY_MS) return `${Math.floor(elapsed / DAY_MS)}d ago`
  return formatDate(msEpoch)
}
