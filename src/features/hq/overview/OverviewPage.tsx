import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useEngagementAnalytics, useFunnelAnalytics, useOpsAnalytics, useOutcomesAnalytics } from '@/api/queries/analytics'
import { useAdminStats, useCreditStats } from '@/api/queries/schools'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { Bars } from '@/components/charts/Bars'
import { Donut } from '@/components/charts/Donut'
import { ScoreDistribution } from '@/components/charts/ScoreDistribution'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterChip, FilterChipRow } from '@/components/ui/FilterChip'
import { PageHeader } from '@/components/ui/PageHeader'
import { apiErrorMessage } from '@/lib/apiError'
import { formatCompact, formatNumber, formatPercent, formatUsd } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/roles'
import type { EngagementAnalytics, PlatformStats, RecentLogin } from '@/types/analytics'
import type { UserRole } from '@/types/common'
import { KpiTile } from '@/features/hq/shared/KpiTile'
import { MiniStat } from '@/features/hq/shared/MiniStat'
import { RoleBadge } from '@/features/hq/shared/RoleBadge'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { Widget, type WidgetQuery } from '@/features/hq/shared/Widget'

const RANGE_OPTIONS = [7, 30, 90]
const DEFAULT_RANGE = 30

function roleLabel(role: string): string {
  return role in ROLE_LABELS ? ROLE_LABELS[role as UserRole] : role
}

function engagementRate(data: EngagementAnalytics): number {
  const total = data.active_students.total_students
  return total > 0 ? (data.active_students.active_7d / total) * 100 : 0
}

const LOGIN_COLUMNS: Column<RecentLogin>[] = [
  {
    key: 'user',
    header: 'User',
    render: (row) => (
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{row.display_name}</p>
        <p className="truncate text-xs text-muted">{row.email}</p>
      </div>
    ),
    sortValue: (row) => row.display_name,
  },
  { key: 'role', header: 'Role', render: (row) => <RoleBadge role={row.role} />, sortValue: (row) => row.role },
  {
    key: 'last_login',
    header: 'Last login',
    align: 'right',
    render: (row) => <Timestamp at={row.last_login_at} />,
    sortValue: (row) => row.last_login_at,
  },
]

/** Content managers can’t read the business endpoints — their overview points at the content workspace until 9F. */
function ContentManagerOverview() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Overview" description="Your content workspace across curriculum, assessments and TLMs." />
      <Card padded={false}>
        <EmptyState
          icon={BookOpen}
          title="Content widgets land with the content wave"
          description="Curriculum coverage and authoring-volume tiles ship alongside the content screens. Meanwhile, head to Curriculum, Assessments or TLMs in the sidebar."
        />
      </Card>
    </div>
  )
}

function PlatformOverview() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const daysParam = Number(searchParams.get('days'))
  const days = RANGE_OPTIONS.includes(daysParam) ? daysParam : DEFAULT_RANGE

  const stats = useAdminStats()
  const engagement = useEngagementAnalytics({ days })
  const outcomes = useOutcomesAnalytics({ days })
  const ops = useOpsAnalytics({ days })
  const funnel = useFunnelAnalytics({ days })
  const creditStats = useCreditStats()

  /** /admin/stats returns the platform shape for HQ roles — narrow the union once for every widget. */
  const platform: WidgetQuery<PlatformStats> = {
    ...stats,
    data: stats.data && 'users_by_role' in stats.data ? stats.data : undefined,
  }

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
        title="Overview"
        description="Platform-wide health: schools, engagement, outcomes and AI spend."
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiTile label="Schools" query={platform} value={(data) => formatNumber(data.school_count)} />
        <KpiTile label="Students" query={platform} value={(data) => formatNumber(data.users_by_role.student ?? 0)} />
        <KpiTile label="Teachers" query={platform} value={(data) => formatNumber(data.users_by_role.teacher ?? 0)} />
        <KpiTile label="Sections" query={platform} value={(data) => formatNumber(data.section_count)} />
        <KpiTile
          label="Active students (7d)"
          query={engagement}
          value={(data) => formatNumber(data.active_students.active_7d)}
          hint={(data) => `${formatPercent(engagementRate(data))} of ${formatNumber(data.active_students.total_students)} engaged`}
        />
        <KpiTile
          label={`AI credits (${days}d)`}
          query={ops}
          value={(data) => formatNumber(Math.round(data.ai.total_credits))}
          hint={(data) => `${formatNumber(data.ai.total_requests)} requests · ${formatUsd(data.ai.total_dollar_cost)}`}
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
        <Widget title="Users by role" description="Every non-deleted account" query={platform} skeletonHeight={260}>
          {(data) => (
            <Donut
              data={Object.entries(data.users_by_role).map(([role, count]) => ({ name: roleLabel(role), value: count }))}
              centerLabel={formatCompact(data.user_count)}
              centerCaption="users"
              height={260}
            />
          )}
        </Widget>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget
          title="Leads"
          description="Pipeline movement across the range"
          query={funnel}
          skeletonHeight={280}
          actions={
            <Button variant="secondary" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => navigate('/leads')}>
              View pipeline
            </Button>
          }
        >
          {(data) => (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="New" value={formatNumber(data.leads.by_status.new)} />
                <MiniStat label="Contacted" value={formatNumber(data.leads.by_status.contacted)} />
                <MiniStat label="Converted" value={formatNumber(data.leads.by_status.converted)} />
              </div>
              <Bars
                data={data.leads.weekly.map((week) => ({ ...week }))}
                xKey="week_start"
                series={[
                  { key: 'created', label: 'Created' },
                  { key: 'converted', label: 'Converted' },
                ]}
                height={140}
                emptyLabel="No leads in this range"
              />
              <p className="text-xs text-muted">
                Conversion rate <span className="font-mono font-semibold text-ink">{formatPercent(data.leads.conversion_rate, 1)}</span>
              </p>
            </div>
          )}
        </Widget>
        <Widget
          title="Score distribution"
          description={`AI evaluation scores, last ${days} days`}
          query={outcomes}
          className="lg:col-span-2"
        >
          {(data) => <ScoreDistribution data={data.scores.distribution} emptyLabel="No evaluations in this range" />}
        </Widget>
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-[15px] font-bold tracking-tight text-ink">Recent logins</h2>
          <p className="mt-0.5 text-[13px] text-muted">Latest sign-ins across every role.</p>
        </div>
        <DataTable
          columns={LOGIN_COLUMNS}
          rows={creditStats.data?.recent_logins ?? []}
          rowKey={(row) => row.id}
          loading={creditStats.isPending}
          error={creditStats.isError ? apiErrorMessage(creditStats.error) : null}
          onRetry={() => void creditStats.refetch()}
          initialSort={{ key: 'last_login', direction: 'desc' }}
          emptyState={<EmptyState title="No logins yet" description="Sign-ins appear here as people start using Edyma." />}
        />
      </section>
    </div>
  )
}

/** HQ landing dashboard — content managers get a content-focused view, sales and super admins the business one. */
export function OverviewPage() {
  const { user } = useAuth()
  if (user?.role === 'super_content_manager') return <ContentManagerOverview />
  return <PlatformOverview />
}
