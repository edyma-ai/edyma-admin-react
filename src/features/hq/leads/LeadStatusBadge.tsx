import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { LEAD_STATUS_LABELS } from '@/features/hq/leads/leadFilters'
import type { LeadStatus } from '@/types/leads'

const STATUS_TONES: Record<LeadStatus, BadgeTone> = {
  new: 'info',
  contacted: 'warning',
  converted: 'success',
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{LEAD_STATUS_LABELS[status]}</Badge>
}
