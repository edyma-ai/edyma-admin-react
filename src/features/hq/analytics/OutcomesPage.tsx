import { AnalyticsLayout } from '@/features/hq/analytics/AnalyticsLayout'
import { useAnalyticsSearchScope } from '@/features/hq/analytics/analyticsScope'
import { OutcomesPillar } from '@/features/hq/analytics/OutcomesPillar'

/** HQ `/analytics/outcomes` — academic outcomes; at-risk rows drill into the school detail. */
export function OutcomesAnalyticsPage() {
  const { days, schoolId } = useAnalyticsSearchScope()
  return (
    <AnalyticsLayout pillar="outcomes">
      <OutcomesPillar
        scope={{ days, schoolId: schoolId || undefined }}
        showSchool={!schoolId}
        atRiskHref={(row) => `/schools/${row.school_id}`}
      />
    </AnalyticsLayout>
  )
}
