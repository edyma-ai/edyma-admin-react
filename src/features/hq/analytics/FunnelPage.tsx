import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useFunnelAnalytics, type AnalyticsScope } from '@/api/queries/analytics'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { Bars } from '@/components/charts/Bars'
import { Donut } from '@/components/charts/Donut'
import { Button } from '@/components/ui/Button'
import { formatCompact, formatNumber, formatPercent } from '@/lib/format'
import { AnalyticsLayout } from '@/features/hq/analytics/AnalyticsLayout'
import { useAnalyticsSearchScope } from '@/features/hq/analytics/analyticsScope'
import { KpiTile } from '@/features/hq/shared/KpiTile'
import { MiniStat } from '@/features/hq/shared/MiniStat'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { Widget } from '@/features/hq/shared/Widget'

function FunnelPanels({ scope }: { scope: AnalyticsScope }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const funnel = useFunnelAnalytics(scope)
  const days = scope.days ?? 30

  return (
    <div className="flex flex-col gap-4">
      {scope.schoolId ? (
        <p className="text-xs text-muted">School scope applies to subscriptions and school growth. Leads and digests stay platform-wide.</p>
      ) : null}

      {/* Lead status/kind/conversion facets are all-time on the backend — only the weekly pipeline is ranged. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="New leads" query={funnel} value={(data) => formatNumber(data.leads.by_status.new)} hint={() => 'All-time'} />
        <KpiTile label="Contacted" query={funnel} value={(data) => formatNumber(data.leads.by_status.contacted)} hint={() => 'All-time'} />
        <KpiTile label="Converted" query={funnel} value={(data) => formatNumber(data.leads.by_status.converted)} hint={() => 'All-time'} />
        <KpiTile
          label="Conversion rate"
          query={funnel}
          value={(data) => formatPercent(data.leads.conversion_rate, 1)}
          hint={() => 'Converted of all leads, all-time'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget title="Weekly pipeline" description="Leads created vs converted per week" query={funnel} className="lg:col-span-2">
          {(data) => (
            <Bars
              data={data.leads.weekly.map((week) => ({ ...week }))}
              xKey="week_start"
              series={[
                { key: 'created', label: 'Created' },
                { key: 'converted', label: 'Converted' },
              ]}
              emptyLabel="No leads in this window yet"
            />
          )}
        </Widget>
        <Widget title="Leads by kind" description="Student vs school pipelines, all-time" query={funnel}>
          {(data) => (
            <Donut
              data={[
                { name: 'Student', value: data.leads.by_kind.student },
                { name: 'School', value: data.leads.by_kind.school },
              ]}
              centerLabel={formatCompact(data.leads.by_kind.student + data.leads.by_kind.school)}
              centerCaption="leads"
              emptyLabel="No leads yet"
            />
          )}
        </Widget>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget title="Subscription activations" description={`Subscriptions activated per day, last ${days} days`} query={funnel} className="lg:col-span-2">
          {(data) => (
            <AreaTrend
              data={data.subscriptions.activations.map((point) => ({ ...point }))}
              xKey="date"
              series={[{ key: 'count', label: 'Activations' }]}
              emptyLabel="No activations in this window yet"
            />
          )}
        </Widget>
        <Widget title="Plan mix" description="Active subscriptions by plan" query={funnel}>
          {(data) => (
            <Donut
              data={data.subscriptions.by_plan.map((plan) => ({ name: plan.plan_name, value: plan.count }))}
              centerLabel={formatNumber(data.subscriptions.active)}
              centerCaption="active"
              emptyLabel="No active subscriptions yet"
            />
          )}
        </Widget>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget title="Schools growth" description="Cumulative schools on the platform" query={funnel} className="lg:col-span-2" skeletonHeight={300}>
          {(data) => (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                <MiniStat label="Total schools" value={formatNumber(data.schools.total)} />
                <MiniStat label="New in range" value={formatNumber(data.schools.new_in_range)} caption={`last ${days} days`} />
              </div>
              <AreaTrend
                data={data.schools.growth.map((point) => ({ ...point }))}
                xKey="date"
                series={[{ key: 'cumulative', label: 'Schools' }]}
                height={200}
                emptyLabel="No schools yet"
              />
            </div>
          )}
        </Widget>
        <Widget
          title="Digests"
          description="Weekly parent report health"
          query={funnel}
          skeletonHeight={300}
          actions={
            user?.role === 'super_admin' ? (
              <Button variant="secondary" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => navigate('/parents/reports')}>
                Parent reports
              </Button>
            ) : undefined
          }
        >
          {(data) => (
            <div className="flex flex-col gap-3">
              <MiniStat label="Sent (7d)" value={formatNumber(data.digests.sent_7d)} caption="parent digests" />
              <div className="rounded-control border border-hairline px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Last run</p>
                <p className="mt-0.5 text-lg font-semibold leading-6 text-ink">
                  <Timestamp at={data.digests.last_run_at} className="text-lg" />
                </p>
              </div>
            </div>
          )}
        </Widget>
      </div>
    </div>
  )
}

/** HQ-only `/analytics/funnel` — leads → activation, subscriptions, school growth and digest health. */
export function FunnelAnalyticsPage() {
  const { days, schoolId } = useAnalyticsSearchScope()
  return (
    <AnalyticsLayout pillar="funnel">
      <FunnelPanels scope={{ days, schoolId: schoolId || undefined }} />
    </AnalyticsLayout>
  )
}
