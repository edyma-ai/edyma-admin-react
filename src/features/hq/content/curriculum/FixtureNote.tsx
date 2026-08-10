import { Lock } from 'lucide-react'

/** Quiet reminder that the curriculum has no edit surface anywhere (single-writer rule). */
export function FixtureNote() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted">
      <Lock aria-hidden className="h-3 w-3" />
      Master content is fixture-managed. Contact the platform team for changes.
    </p>
  )
}
