import { Badge } from '@/components/ui/Badge'
import type { AssessmentStatus } from '@/types/assessments'

export function AssessmentStatusBadge({ status }: { status: AssessmentStatus }) {
  return <Badge tone={status === 'published' ? 'success' : 'neutral'}>{status === 'published' ? 'Published' : 'Draft'}</Badge>
}

/** First couple of section labels + an overflow count; falls back to a dash when none resolve. */
export function SectionBadges({ ids, labels }: { ids: string[]; labels: Map<string, string> }) {
  const known = ids.map((id) => labels.get(id)).filter((label): label is string => Boolean(label))
  if (known.length === 0) return <span className="text-muted">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {known.slice(0, 2).map((label) => (
        <Badge key={label} tone="neutral">
          {label}
        </Badge>
      ))}
      {known.length > 2 ? <Badge tone="neutral">+{known.length - 2}</Badge> : null}
    </div>
  )
}
