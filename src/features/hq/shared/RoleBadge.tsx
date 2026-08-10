import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { ROLE_LABELS } from '@/lib/roles'
import type { UserRole } from '@/types/common'

const ROLE_TONES: Record<UserRole, BadgeTone> = {
  super_admin: 'danger',
  super_sales_manager: 'warning',
  super_content_manager: 'info',
  school_manager: 'sky',
  teacher: 'success',
  student: 'neutral',
}

/** Role chip with a consistent tone per role — accepts raw strings so API rows render safely. */
export function RoleBadge({ role }: { role: string }) {
  const known = role in ROLE_TONES ? (role as UserRole) : null
  return <Badge tone={known ? ROLE_TONES[known] : 'neutral'}>{known ? ROLE_LABELS[known] : role}</Badge>
}
