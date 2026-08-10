import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useEngagementAnalytics, useOutcomesAnalytics } from '@/api/queries/analytics'
import { useClasses } from '@/api/queries/curriculum'
import { useSchoolEntitlements } from '@/api/queries/plans'
import { useAdminStats, useMySchool } from '@/api/queries/schools'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { Bars } from '@/components/charts/Bars'
import { Donut } from '@/components/charts/Donut'
import { bandColor } from '@/components/charts/palette'
import { ScoreDistribution } from '@/components/charts/ScoreDistribution'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterChip, FilterChipRow } from '@/components/ui/FilterChip'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCompact, formatDuration, formatNumber, formatPercent } from '@/lib/format'
import type { MasteryBandName, SchoolStats } from '@/types/analytics'
import { KpiTile } from '@/features/hq/shared/KpiTile'
import { PlanBadge } from '@/features/hq/shared/PlanBadge'
import { Widget, type WidgetQuery } from '@/features/hq/shared/Widget'

const RANGE_OPTIONS = [7, 30, 90]
const DEFAULT_RANGE = 30

const MASTERY_BANDS: Record<MasteryBandName, { label: string; color: string }> = {
  strong: { label: 'Strong', color: bandColor.success },
  getting_there: { label: 'Getting there', color: bandColor.warning },
  needs_work: { label: 'Needs work', color: bandColor.danger },
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** School OS landing — the manager's daily read on headcounts, activity and outcomes. */
export function SchoolOverviewPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const daysParam = Number(searchParams.get('days'))
  const days = RANGE_OPTIONS.includes(daysParam) ? daysParam : DEFAULT_RANGE

  const school = useMySchool()
  const entitlements = useSchoolEntitlements(user?.school_id ?? undefined)
  const stats = useAdminStats()
  const engagement = useEngagementAnalytics({ days })
  const outcomes = useOutcomesAnalytics({ days })
  const classes = useClasses()

  /** /admin/stats returns the school shape for managers — narrow the union once for every tile. */
  const schoolStats: WidgetQuery<SchoolStats> = {
    ...stats,
    data: stats.data && 'teacher_count' in stats.data ? stats.data : undefined,
  }

  const classNames = useMemo(() => new Map((classes.data ?? []).map((cls) => [cls.id, cls.name])), [classes.data])
  const firstName = user?.display_name.split(' ')[0] ?? 'there'

  function setDays(value: number) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === DEFAULT_RANGE) next.delete('days')
        else next.set('days', String(value))
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2.5">
            {school.data?.name ?? 'Overview'}
            {school.data ? <PlanBadge planType={school.data.plan_type} /> : null}
            {entitlements.data?.plan_name ? <Badge tone="neutral">{entitlements.data.plan_name}</Badge> : null}
          </span>
        }
        description={`${greeting()}, ${firstName}. Here’s how your school is doing.`}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <KpiTile label="Teachers" query={schoolStats} value={(data) => formatNumber(data.teacher_count)} />
        <KpiTile label="Students" query={schoolStats} value={(data) => formatNumber(data.student_count)} />
        <KpiTile label="Sections" query={schoolStats} value={(data) => formatNumber(data.section_count)} />
        <KpiTile
          label="Active students (7d)"
          query={engagement}
          value={(data) => formatNumber(data.active_students.active_7d)}
          hint={(data) =>
            data.active_students.total_students > 0
              ? `${formatPercent((data.active_students.active_7d / data.active_students.total_students) * 100)} of ${formatNumber(data.active_students.total_students)} engaged`
              : 'No students yet'
          }
        />
        <KpiTile
          label="Daily time"
          query={engagement}
          value={(data) => formatDuration(data.time_spent.avg_daily_minutes_per_active_student)}
          hint={() => 'Per active student'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget
          title="Daily active students"
          description={`Students with learning activity, last ${days} days`}
          query={engagement}
          className="lg:col-span-2"
        >
          {(data) => (
            <AreaTrend
              data={data.active_students.dau.map((point) => ({ ...point }))}
              xKey="date"
              series={[{ key: 'count', label: 'Active students' }]}
              emptyLabel="No learning activity in this range"
            />
          )}
        </Widget>
        <Widget title="Mastery bands" description="Students by current topic mastery" query={outcomes} skeletonHeight={260}>
          {(data) => (
            <Donut
              data={data.mastery.distribution.map((band) => ({
                name: MASTERY_BANDS[band.band]?.label ?? band.band,
                value: band.students,
                color: MASTERY_BANDS[band.band]?.color,
              }))}
              centerLabel={formatCompact(data.mastery.distribution.reduce((sum, band) => sum + band.students, 0))}
              centerCaption="students"
              height={260}
              emptyLabel="No mastery data yet"
            />
          )}
        </Widget>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget
          title="Score distribution"
          description={`AI evaluation scores, last ${days} days`}
          query={outcomes}
          className="lg:col-span-2"
        >
          {(data) => <ScoreDistribution data={data.scores.distribution} emptyLabel="No evaluations in this range" />}
        </Widget>
        <Widget title="At-risk sections" description="Sections with students needing extra support" query={outcomes} skeletonHeight={260}>
          {(data) =>
            data.at_risk.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No sections at risk"
                description="No students are flagged for extra support right now."
                className="py-6"
              />
            ) : (
              <ul className="flex flex-col">
                {data.at_risk.map((row) => (
                  <li key={row.section_id}>
                    <Link
                      to={`/sections/${row.section_id}`}
                      className="focus-ring flex items-center justify-between gap-3 rounded-control border-b border-hairline px-1 py-2.5 transition-colors last:border-b-0 hover:bg-sky-soft/50 dark:hover:bg-sky-soft/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{row.section_label}</p>
                        <p className="truncate text-xs text-muted">{classNames.get(row.class_id) ?? row.class_id}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="font-mono text-[13px] font-semibold text-danger">
                          {formatNumber(row.at_risk_count)}
                          <span className="font-medium text-muted">/{formatNumber(row.student_count)}</span>
                        </span>
                        <ChevronRight aria-hidden className="h-4 w-4 text-muted" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          }
        </Widget>
      </div>

      <Widget title="Learning modes" description={`How students spend their learning events, last ${days} days`} query={engagement} skeletonHeight={220}>
        {(data) => (
          <Bars
            data={data.mode_mix.map((entry) => ({ ...entry }))}
            xKey="mode"
            series={[
              { key: 'events', label: 'Events' },
              { key: 'students', label: 'Students' },
            ]}
            height={200}
            emptyLabel="No learning activity in this range"
          />
        )}
      </Widget>
    </div>
  )
}
