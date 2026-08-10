import { Badge, type BadgeTone } from '@/components/ui/Badge'

const PLAN_TONES: Record<string, BadgeTone> = {
  school: 'sky',
  retail: 'warning',
}

/** Plan-type chip for school rows and headers ('school' | 'retail'). */
export function PlanBadge({ planType }: { planType?: string | null }) {
  if (!planType) return <Badge tone="neutral">No plan</Badge>
  return <Badge tone={PLAN_TONES[planType] ?? 'neutral'}>{planType.charAt(0).toUpperCase() + planType.slice(1)}</Badge>
}
