/* eslint-disable react-refresh/only-export-components -- tiny badge + flow metadata shared across the TLM pages */
import { Badge } from '@/components/ui/Badge'
import type { Tlm } from '@/types/tlm'

/** The two-step authoring flow the mobile app established: outline → final → share. */
export const TLM_STEPS = [{ label: 'Scope & outline' }, { label: 'Review & final' }, { label: 'Share' }]

export function TlmStatusBadge({ status }: { status: string }) {
  return <Badge tone={status === 'shared' ? 'success' : 'neutral'}>{status === 'shared' ? 'Shared' : 'Draft'}</Badge>
}

/** Where a TLM sits in the flow, for the list's Stage column. */
export function tlmStage(tlm: Tlm): string {
  if (tlm.status === 'shared') return 'Live for students'
  return tlm.modules.length > 1 ? 'Final ready' : 'Outline review'
}
