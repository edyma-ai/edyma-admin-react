import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { EngagementAnalytics, FunnelAnalytics, OpsAnalytics, OutcomesAnalytics, SectionAnalytics } from '@/types/analytics'

/**
 * Four-pillar analytics (`/admin/analytics/*`, backend lands in 9B — shapes are
 * locked in the plan doc). school_manager calls are auto-scoped server-side;
 * HQ roles pass an optional school filter.
 */

export interface AnalyticsScope {
  schoolId?: string
  /** Range in days, 7–180 (backend default 30). */
  days?: number
}

function scopeParams(scope: AnalyticsScope) {
  return { school_id: scope.schoolId || undefined, days: scope.days }
}

export function useEngagementAnalytics(scope: AnalyticsScope = {}) {
  return useQuery({
    queryKey: ['analytics', 'engagement', scope],
    queryFn: async () => (await api.get<EngagementAnalytics>('/api/v1/admin/analytics/engagement', { params: scopeParams(scope) })).data,
  })
}

export function useOutcomesAnalytics(scope: AnalyticsScope = {}) {
  return useQuery({
    queryKey: ['analytics', 'outcomes', scope],
    queryFn: async () => (await api.get<OutcomesAnalytics>('/api/v1/admin/analytics/outcomes', { params: scopeParams(scope) })).data,
  })
}

/**
 * HQ only — school managers receive 403. `schoolId` scopes subscriptions and
 * school growth; leads and digests stay platform-wide server-side.
 */
export function useFunnelAnalytics(scope: AnalyticsScope = {}) {
  return useQuery({
    queryKey: ['analytics', 'funnel', scope],
    queryFn: async () => (await api.get<FunnelAnalytics>('/api/v1/admin/analytics/funnel', { params: scopeParams(scope) })).data,
  })
}

export function useOpsAnalytics(scope: AnalyticsScope = {}) {
  return useQuery({
    queryKey: ['analytics', 'ops', scope],
    queryFn: async () => (await api.get<OpsAnalytics>('/api/v1/admin/analytics/ops', { params: scopeParams(scope) })).data,
  })
}

/** Manager-safe section insights variant (decision 7 in the plan). */
export function useSectionAnalytics(sectionId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'section', sectionId],
    enabled: Boolean(sectionId),
    queryFn: async () => (await api.get<SectionAnalytics>(`/api/v1/admin/analytics/sections/${sectionId}`)).data,
  })
}
