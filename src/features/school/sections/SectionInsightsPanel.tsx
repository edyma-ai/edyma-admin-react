import { useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight, Lightbulb, MoveRight } from 'lucide-react'
import { useSectionAnalytics } from '@/api/queries/analytics'
import { Bars } from '@/components/charts/Bars'
import { Badge, ScoreBadge } from '@/components/ui/Badge'
import { Card, SectionCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatTile } from '@/components/ui/StatTile'
import { cn } from '@/lib/cn'
import { apiErrorMessage } from '@/lib/apiError'
import { formatDuration, formatNumber, scoreBand, type ScoreBand } from '@/lib/format'
import type { SectionAnalytics, StudentInsight, StudentTrend } from '@/types/analytics'
import type { Section } from '@/types/sections'

const BAND_TEXT: Record<ScoreBand, string> = {
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
}

const TREND_META: Record<StudentTrend, { icon: typeof ArrowUpRight; tone: string; label: string; rank: number }> = {
  up: { icon: ArrowUpRight, tone: 'text-success', label: 'Up', rank: 1 },
  flat: { icon: MoveRight, tone: 'text-muted', label: 'Flat', rank: 0 },
  down: { icon: ArrowDownRight, tone: 'text-danger', label: 'Down', rank: -1 },
}

function TrendCell({ trend }: { trend?: StudentTrend | null }) {
  const meta = trend ? TREND_META[trend] : null
  if (!meta) return <span className="text-muted">—</span>
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[13px] font-semibold', meta.tone)}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  )
}

const STUDENT_COLUMNS: Column<StudentInsight>[] = [
  {
    key: 'student',
    header: 'Student',
    render: (row) =>
      row.display_name ? <span className="font-semibold text-ink">{row.display_name}</span> : <span className="font-mono text-xs text-muted">{row.student_id}</span>,
    sortValue: (row) => row.display_name ?? row.student_id,
  },
  {
    key: 'average',
    header: 'Average',
    align: 'right',
    render: (row) => (row.average != null ? <ScoreBadge score={row.average} /> : <span className="text-muted">—</span>),
    sortValue: (row) => row.average ?? -1,
  },
  {
    key: 'trend',
    header: 'Trend',
    align: 'right',
    render: (row) => <TrendCell trend={row.trend} />,
    // up > flat > down; students without a trend yet sort below all three.
    sortValue: (row) => (row.trend ? TREND_META[row.trend].rank : -2),
  },
  {
    key: 'risk',
    header: 'Status',
    render: (row) => (row.at_risk ? <Badge tone="danger">At risk</Badge> : <Badge tone="success">On track</Badge>),
    sortValue: (row) => (row.at_risk ? 1 : 0),
  },
]

function InsightStats({ data }: { data: SectionAnalytics }) {
  const enrolled = formatNumber(data.engagement.total_enrolled)
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Class average"
        value={
          data.class_average != null ? <span className={BAND_TEXT[scoreBand(data.class_average)]}>{Math.round(data.class_average)}%</span> : '—'
        }
        hint="Across AI evaluation scores"
      />
      <StatTile label="Evaluations completed" value={formatNumber(data.evaluated_count)} hint="AI evaluation runs behind the average" />
      <StatTile label="Active (7d)" value={formatNumber(data.engagement.active_7d)} hint={`of ${enrolled} enrolled`} />
      <StatTile label="Daily time (7d)" value={formatDuration(data.engagement.avg_daily_minutes_7d)} hint="Per active student" />
    </div>
  )
}

/** Insights tab of School OS section detail — GET /admin/analytics/sections/{id}. */
export function SectionInsightsPanel({ section }: { section: Section }) {
  const insights = useSectionAnalytics(section.id)
  const students = useMemo(() => insights.data?.students ?? [], [insights.data])

  if (insights.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-card" />
          ))}
        </div>
        <Skeleton className="h-14 w-full rounded-card" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-card lg:col-span-2" />
          <Skeleton className="h-80 w-full rounded-card" />
        </div>
      </div>
    )
  }
  if (insights.isError) {
    return (
      <Card padded={false}>
        <ErrorState message={apiErrorMessage(insights.error)} onRetry={() => void insights.refetch()} />
      </Card>
    )
  }
  const data = insights.data
  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <InsightStats data={data} />

      {data.insight_text ? (
        <Card className="flex items-start gap-3 border-info/25 bg-info-soft/40">
          <Lightbulb aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p className="text-[13px] font-medium text-ink">{data.insight_text}</p>
        </Card>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-ink">Students</h2>
            <p className="mt-0.5 text-[13px] text-muted">Evaluation averages with at-risk students first.</p>
          </div>
          <DataTable
            columns={STUDENT_COLUMNS}
            rows={students}
            rowKey={(row) => row.student_id}
            initialSort={{ key: 'risk', direction: 'desc' }}
            emptyState={
              <EmptyState
                title="No students enrolled yet"
                description="Enroll students from the Students tab. Their evaluation averages appear here."
              />
            }
          />
        </div>
        <SectionCard title="Mode mix" description="Learning events by mode, last 7 days">
          <Bars
            data={data.engagement.mode_mix.map((entry) => ({ ...entry }))}
            xKey="mode"
            series={[{ key: 'events', label: 'Events' }]}
            height={240}
            emptyLabel="No learning activity this week"
          />
        </SectionCard>
      </div>
    </div>
  )
}
