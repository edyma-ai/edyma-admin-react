import { AnalyticsLayout } from '@/features/hq/analytics/AnalyticsLayout'
import { useAnalyticsSearchScope } from '@/features/hq/analytics/analyticsScope'
import { EngagementPillar } from '@/features/hq/analytics/EngagementPillar'

/** HQ `/analytics/engagement` — the engagement & learning pillar, optionally scoped by school. */
export function EngagementAnalyticsPage() {
  const { days, schoolId } = useAnalyticsSearchScope()
  return (
    <AnalyticsLayout pillar="engagement">
      <EngagementPillar scope={{ days, schoolId: schoolId || undefined }} />
    </AnalyticsLayout>
  )
}
