import { useState } from 'react'
import { useEngagementAnalytics, useOutcomesAnalytics } from '@/api/queries/analytics'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { ScoreDistribution } from '@/components/charts/ScoreDistribution'
import { FilterChip, FilterChipRow } from '@/components/ui/FilterChip'
import { formatDuration, formatNumber } from '@/lib/format'
import type { School } from '@/types/schools'
import { MiniStat } from '@/features/hq/shared/MiniStat'
import { Widget } from '@/features/hq/shared/Widget'

const RANGE_OPTIONS = [7, 30, 90]

/** Compact per-school engagement + outcomes, scoped via ?school_id=. */
export function SchoolAnalyticsTab({ school }: { school: School }) {
  const [days, setDays] = useState(30)
  const engagement = useEngagementAnalytics({ schoolId: school.id, days })
  const outcomes = useOutcomesAnalytics({ schoolId: school.id, days })

  return (
    <div className="flex flex-col gap-4">
      <FilterChipRow className="justify-end">
        {RANGE_OPTIONS.map((option) => (
          <FilterChip key={option} active={days === option} onClick={() => setDays(option)}>
            {option}d
          </FilterChip>
        ))}
      </FilterChipRow>

      <div className="grid gap-4 xl:grid-cols-2">
        <Widget title="Engagement" description={`Learning activity at ${school.name}, last ${days} days`} query={engagement} skeletonHeight={320}>
          {(data) => (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <MiniStat
                  label="Active (7d)"
                  value={formatNumber(data.active_students.active_7d)}
                  caption={`of ${formatNumber(data.active_students.total_students)} students`}
                />
                <MiniStat label="Time spent" value={formatDuration(data.time_spent.total_minutes)} caption="in range" />
                <MiniStat label="Daily avg" value={formatDuration(data.time_spent.avg_daily_minutes_per_active_student)} caption="per active student" />
              </div>
              <AreaTrend
                data={data.active_students.dau.map((point) => ({ ...point }))}
                xKey="date"
                series={[{ key: 'count', label: 'Active students' }]}
                height={200}
                emptyLabel="No activity in this range"
              />
            </div>
          )}
        </Widget>

        <Widget title="Outcomes" description={`AI evaluation scores, last ${days} days`} query={outcomes} skeletonHeight={320}>
          {(data) => (
            <div className="flex flex-col gap-4">
              <ScoreDistribution data={data.scores.distribution} height={150} emptyLabel="No evaluations in this range" />
              <AreaTrend
                data={data.scores.trend.map((point) => ({ ...point }))}
                xKey="date"
                series={[{ key: 'avg_score', label: 'Avg score' }]}
                height={130}
                emptyLabel="No score trend yet"
              />
            </div>
          )}
        </Widget>
      </div>
    </div>
  )
}
