import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useOpsAnalytics, type AnalyticsScope } from '@/api/queries/analytics'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { Bars } from '@/components/charts/Bars'
import { Donut } from '@/components/charts/Donut'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { apiErrorMessage } from '@/lib/apiError'
import { formatCompact, formatNumber, formatUsd } from '@/lib/format'
import type { OpsAnalytics } from '@/types/analytics'
import { AnalyticsLayout } from '@/features/hq/analytics/AnalyticsLayout'
import { humanize, useAnalyticsSearchScope } from '@/features/hq/analytics/analyticsScope'
import { KpiTile } from '@/features/hq/shared/KpiTile'
import { MiniStat } from '@/features/hq/shared/MiniStat'
import { Widget } from '@/features/hq/shared/Widget'

type SchoolCostRow = OpsAnalytics['ai']['by_school'][number]

const SCHOOL_COST_COLUMNS: Column<SchoolCostRow>[] = [
  {
    key: 'school',
    header: 'School',
    render: (row) =>
      row.school_name ? <span className="font-semibold text-ink">{row.school_name}</span> : <span className="text-muted">Platform / unattributed</span>,
    sortValue: (row) => row.school_name,
  },
  {
    key: 'credits',
    header: 'Credits',
    align: 'right',
    mono: true,
    render: (row) => formatNumber(Math.round(row.credits)),
    sortValue: (row) => row.credits,
  },
  { key: 'cost', header: 'Cost', align: 'right', mono: true, render: (row) => formatUsd(row.dollar_cost), sortValue: (row) => row.dollar_cost },
]

function OpsPanels({ scope }: { scope: AnalyticsScope }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const ops = useOpsAnalytics(scope)
  const days = scope.days ?? 30

  const aiTrend = useMemo(
    () => (ops.data?.ai.time_series ?? []).map((point) => ({ date: point.date, credits: Math.round(point.credits), requests: point.count })),
    [ops.data],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiTile
          label={`AI credits (${days}d)`}
          query={ops}
          value={(data) => formatNumber(Math.round(data.ai.total_credits))}
          hint={(data) => `${formatUsd(data.ai.total_dollar_cost)} spend`}
        />
        <KpiTile label="AI spend" query={ops} value={(data) => formatUsd(data.ai.total_dollar_cost)} hint={() => 'In range'} />
        <KpiTile label="AI requests" query={ops} value={(data) => formatNumber(data.ai.total_requests)} hint={() => 'In range'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget title="AI usage over time" description={`Credits and requests per day, last ${days} days`} query={ops} className="lg:col-span-2">
          {() => (
            <AreaTrend
              data={aiTrend}
              xKey="date"
              series={[
                { key: 'credits', label: 'Credits' },
                { key: 'requests', label: 'Requests', yAxisId: 'right' },
              ]}
              emptyLabel="No AI usage in this window yet"
            />
          )}
        </Widget>
        <Widget title="By workflow" description="Credits per AI workflow" query={ops}>
          {(data) => (
            <Bars
              data={data.ai.by_workflow.map((row) => ({ workflow: humanize(row.workflow_type), credits: Math.round(row.credits) }))}
              xKey="workflow"
              series={[{ key: 'credits', label: 'Credits' }]}
              emptyLabel="No AI usage in this window yet"
            />
          )}
        </Widget>
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-[15px] font-bold tracking-tight text-ink">AI cost by school</h2>
          <p className="mt-0.5 text-[13px] text-muted">Where the credits go, school by school.</p>
        </div>
        <DataTable
          columns={SCHOOL_COST_COLUMNS}
          rows={ops.data?.ai.by_school ?? []}
          rowKey={(row) => row.school_id ?? 'platform'}
          loading={ops.isPending}
          error={ops.isError ? apiErrorMessage(ops.error) : null}
          onRetry={() => void ops.refetch()}
          pageSize={8}
          initialSort={{ key: 'credits', direction: 'desc' }}
          emptyState={<EmptyState title="No AI usage yet" description="School-level costs appear once students and teachers start using AI features." />}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget
          title="Support load"
          description="Tickets created per week"
          query={ops}
          className="lg:col-span-2"
          skeletonHeight={300}
          actions={
            user?.role === 'super_admin' ? (
              <Button variant="secondary" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => navigate('/ops/support')}>
                Open inbox
              </Button>
            ) : undefined
          }
        >
          {(data) => (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="Open" value={formatNumber(data.support.open)} />
                <MiniStat label="In progress" value={formatNumber(data.support.in_progress)} />
                <MiniStat label="Resolved" value={formatNumber(data.support.resolved_in_range)} caption="in range" />
              </div>
              <Bars
                data={data.support.weekly.map((week) => ({ ...week }))}
                xKey="week_start"
                series={[{ key: 'created', label: 'Created' }]}
                height={190}
                emptyLabel="No tickets in this window yet"
              />
            </div>
          )}
        </Widget>
        <Widget title="Tickets by category" description="What people write in about" query={ops} skeletonHeight={300}>
          {(data) => (
            <Donut
              data={data.support.by_category.map((row) => ({ name: humanize(row.category), value: row.count }))}
              centerLabel={formatCompact(data.support.by_category.reduce((sum, row) => sum + row.count, 0))}
              centerCaption="tickets"
              height={260}
              emptyLabel="No tickets in this window yet"
            />
          )}
        </Widget>
      </div>

      <Widget title="Notifications" description={`Feed volume and device reach, last ${days} days`} query={ops} skeletonHeight={260}>
        {(data) => (
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className="flex flex-col gap-3">
              <MiniStat label="Feed items" value={formatNumber(data.notifications.feed_items_in_range)} caption="in range" />
              <MiniStat label="Devices registered" value={formatNumber(data.notifications.devices_registered)} caption="push-capable" />
            </div>
            <Bars
              data={data.notifications.by_type.map((row) => ({ type: humanize(row.type), count: row.count }))}
              xKey="type"
              series={[{ key: 'count', label: 'Items' }]}
              height={200}
              emptyLabel="No notifications in this window yet"
            />
          </div>
        )}
      </Widget>
    </div>
  )
}

/** HQ `/analytics/ops` — AI cost/credits, support load and notification volumes. */
export function OpsAnalyticsPage() {
  const { days, schoolId } = useAnalyticsSearchScope()
  return (
    <AnalyticsLayout pillar="ops">
      <OpsPanels scope={{ days, schoolId: schoolId || undefined }} />
    </AnalyticsLayout>
  )
}
