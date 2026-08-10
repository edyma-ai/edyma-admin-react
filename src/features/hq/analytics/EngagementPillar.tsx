import { Info } from 'lucide-react'
import { useEngagementAnalytics, type AnalyticsScope } from '@/api/queries/analytics'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { Bars } from '@/components/charts/Bars'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/cn'
import { formatCompact, formatDuration, formatNumber, formatPercent } from '@/lib/format'
import type { EngagementAnalytics, TimeSpentSource } from '@/types/analytics'
import { humanize } from '@/features/hq/analytics/analyticsScope'
import { KpiTile } from '@/features/hq/shared/KpiTile'
import { MiniStat } from '@/features/hq/shared/MiniStat'
import { Widget } from '@/features/hq/shared/Widget'

const TIME_SPENT_SOURCE: Record<TimeSpentSource, string> = {
  derived: 'derived from activity sessions (30-minute gap rule)',
  time_spent: 'reported by the app',
  mixed: 'app-reported where available, otherwise derived from activity sessions',
}

function engagementRate(data: EngagementAnalytics): number {
  const total = data.active_students.total_students
  return total > 0 ? (data.active_students.active_7d / total) * 100 : 0
}

/** Students-at-cap stat — warms to a warning tint only once someone actually hits the cap. */
function CapStat({ count }: { count: number }) {
  const flagged = count > 0
  return (
    <div className={cn('rounded-control border px-3 py-2', flagged ? 'border-warning/50 bg-warning-soft' : 'border-hairline')}>
      <div className="flex items-center gap-1">
        <p className={cn('text-[11px] font-semibold uppercase tracking-wide', flagged ? 'text-warning' : 'text-muted')}>At daily cap</p>
        <Tooltip content="Students who hit the daily coin cap in the last 7 days">
          <Info aria-hidden className={cn('h-3 w-3', flagged ? 'text-warning' : 'text-muted')} />
        </Tooltip>
      </div>
      <p className="mt-0.5 font-mono text-lg font-semibold leading-6 text-ink">{formatNumber(count)}</p>
    </div>
  )
}

export interface EngagementPillarProps {
  scope: AnalyticsScope
}

/**
 * The full engagement pillar — shared by HQ `/analytics/engagement` and the
 * School OS analytics page (where the backend auto-scopes to the manager's school).
 */
export function EngagementPillar({ scope }: EngagementPillarProps) {
  const engagement = useEngagementAnalytics(scope)
  const days = scope.days ?? 30

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiTile label="Students" query={engagement} value={(data) => formatNumber(data.active_students.total_students)} hint={() => 'In scope'} />
        <KpiTile
          label="Active (7d)"
          query={engagement}
          value={(data) => formatNumber(data.active_students.active_7d)}
          hint={(data) => `of ${formatNumber(data.active_students.total_students)} students`}
        />
        <KpiTile label="Active (30d)" query={engagement} value={(data) => formatNumber(data.active_students.active_30d)} />
        <KpiTile
          label="Engagement rate"
          query={engagement}
          value={(data) => formatPercent(engagementRate(data))}
          hint={() => 'Active 7d of all students'}
        />
        <KpiTile
          label="Daily average"
          query={engagement}
          value={(data) => formatDuration(data.time_spent.avg_daily_minutes_per_active_student)}
          hint={() => 'Per active student'}
        />
        <KpiTile label="Time spent" query={engagement} value={(data) => formatDuration(data.time_spent.total_minutes)} hint={() => 'In range'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget title="Daily active students" description={`Students with learning activity, last ${days} days`} query={engagement} className="lg:col-span-2">
          {(data) => (
            <AreaTrend
              data={data.active_students.dau.map((point) => ({ ...point }))}
              xKey="date"
              series={[{ key: 'count', label: 'Active students' }]}
              emptyLabel="No activity in this window yet"
            />
          )}
        </Widget>
        <Widget title="Mode mix" description="Events and unique students by mode" query={engagement}>
          {(data) => (
            <Bars
              data={data.mode_mix.map((entry) => ({ ...entry, mode: humanize(entry.mode) }))}
              xKey="mode"
              series={[
                { key: 'events', label: 'Events' },
                { key: 'students', label: 'Students' },
              ]}
              emptyLabel="No activity in this window yet"
            />
          )}
        </Widget>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget title="Time spent" description={`Minutes per day, last ${days} days`} query={engagement} className="lg:col-span-2" skeletonHeight={300}>
          {(data) => (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                <MiniStat label="Total" value={formatDuration(data.time_spent.total_minutes)} caption="in range" />
                <MiniStat label="Daily average" value={formatDuration(data.time_spent.avg_daily_minutes_per_active_student)} caption="per active student" />
              </div>
              <AreaTrend
                data={data.time_spent.daily.map((point) => ({ ...point }))}
                xKey="date"
                series={[{ key: 'minutes', label: 'Minutes' }]}
                height={190}
                valueFormatter={formatDuration}
                emptyLabel="No time tracked in this window yet"
              />
              <p className="text-xs text-muted">Minutes are {TIME_SPENT_SOURCE[data.time_spent.source]}.</p>
            </div>
          )}
        </Widget>
        <Widget title="Time by mode" description="Where the minutes go" query={engagement} skeletonHeight={300}>
          {(data) => (
            <Bars
              data={data.time_spent.by_mode.map((entry) => ({ mode: humanize(entry.mode), minutes: Math.round(entry.minutes) }))}
              xKey="mode"
              series={[{ key: 'minutes', label: 'Minutes' }]}
              height={280}
              valueFormatter={formatDuration}
              emptyLabel="No time tracked in this window yet"
            />
          )}
        </Widget>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget title="Weekly active students" description="Unique students per week" query={engagement} skeletonHeight={280}>
          {(data) => (
            <Bars
              data={data.active_students.wau.map((point) => ({ ...point }))}
              xKey="week_start"
              series={[{ key: 'count', label: 'Active students' }]}
              height={260}
              emptyLabel="No activity in this window yet"
            />
          )}
        </Widget>
        <Widget title="Streaks" description="Students by current streak length" query={engagement} skeletonHeight={280}>
          {(data) => (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Active streaks" value={formatNumber(data.streaks.active_streaks)} />
                <MiniStat label="Avg length" value={data.streaks.avg_length.toFixed(1)} caption="days" />
              </div>
              <Bars
                data={data.streaks.distribution.map((entry) => ({ ...entry }))}
                xKey="bucket"
                series={[{ key: 'count', label: 'Students' }]}
                height={170}
                emptyLabel="No active streaks yet"
              />
            </div>
          )}
        </Widget>
        <Widget title="Coins" description={`Awarded per day, last ${days} days`} query={engagement} skeletonHeight={280}>
          {(data) => (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Total awarded" value={formatCompact(data.coins.total_awarded)} />
                <CapStat count={data.coins.students_at_daily_cap_7d} />
              </div>
              <AreaTrend
                data={data.coins.daily.map((point) => ({ ...point }))}
                xKey="date"
                series={[{ key: 'coins', label: 'Coins' }]}
                height={170}
                emptyLabel="No coins awarded in this window yet"
              />
            </div>
          )}
        </Widget>
      </div>
    </div>
  )
}
