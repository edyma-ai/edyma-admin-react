/* eslint-disable react-refresh/only-export-components -- the gate detector travels with its notice card */
import axios from 'axios'
import { Lock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

/**
 * Detects the plan feature-gate 403 ("This feature is not available on your
 * plan") — deliberately distinct from the RBAC 403 — so pages can show a calm
 * product notice instead of a generic error.
 */
export function featureGateMessage(err: unknown): string | null {
  if (!axios.isAxiosError(err) || err.response?.status !== 403) return null
  const detail = (err.response.data as { detail?: unknown })?.detail
  if (typeof detail === 'string' && detail.toLowerCase().includes('not available on your plan')) return detail
  return null
}

export interface FeatureGateNoticeProps {
  /** e.g. 'Assessments', 'TLM study guides'. */
  feature: string
}

export function FeatureGateNotice({ feature }: FeatureGateNoticeProps) {
  return (
    <Card>
      <EmptyState
        icon={Lock}
        title={`${feature} is off for this plan`}
        description="The server gates this feature per school plan. A super admin can enable it from the school's Plan & features tab."
      />
    </Card>
  )
}
