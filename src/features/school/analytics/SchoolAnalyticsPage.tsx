import { useSearchParams } from 'react-router-dom'
import { FilterChip, FilterChipRow } from '@/components/ui/FilterChip'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { RANGE_OPTIONS, useAnalyticsSearchScope } from '@/features/hq/analytics/analyticsScope'
import { EngagementPillar } from '@/features/hq/analytics/EngagementPillar'
import { OutcomesPillar } from '@/features/hq/analytics/OutcomesPillar'

const TABS: TabItem[] = [
  { value: 'engagement', label: 'Engagement' },
  { value: 'outcomes', label: 'Outcomes' },
]

/**
 * School OS /analytics — the shared engagement and outcomes pillar panels,
 * auto-scoped to the manager's school by the backend. At-risk rows drill into
 * the section detail (managers can't see other schools).
 */
export function SchoolAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { days, setDays } = useAnalyticsSearchScope()

  const requestedTab = searchParams.get('tab')
  const tab = TABS.some((item) => item.value === requestedTab) ? (requestedTab as string) : 'engagement'

  function setTab(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === 'engagement') next.delete('tab')
        else next.set('tab', value)
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Analytics"
        description="Engagement and academic outcomes for your school."
        actions={
          <FilterChipRow>
            {RANGE_OPTIONS.map((option) => (
              <FilterChip key={option} active={days === option} onClick={() => setDays(option)}>
                {option}d
              </FilterChip>
            ))}
          </FilterChipRow>
        }
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'engagement' ? (
        <EngagementPillar scope={{ days }} />
      ) : (
        <OutcomesPillar scope={{ days }} atRiskHref={(row) => `/sections/${row.section_id}`} />
      )}
    </div>
  )
}
