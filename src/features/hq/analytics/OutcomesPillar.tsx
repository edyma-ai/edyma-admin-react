import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOutcomesAnalytics, type AnalyticsScope } from '@/api/queries/analytics'
import { useClasses } from '@/api/queries/curriculum'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { Donut } from '@/components/charts/Donut'
import { bandColor } from '@/components/charts/palette'
import { ScoreDistribution } from '@/components/charts/ScoreDistribution'
import { ScoreBadge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { apiErrorMessage } from '@/lib/apiError'
import { formatCompact, formatNumber, formatPercent } from '@/lib/format'
import type { MasteryBandName, OutcomesAnalytics } from '@/types/analytics'
import { Widget } from '@/features/hq/shared/Widget'
import { useSubjectNames } from '@/features/shared/assessments/useSubjectNames'

type AtRiskRow = OutcomesAnalytics['at_risk'][number]
type HotspotRow = OutcomesAnalytics['chapter_hotspots'][number]

const MASTERY_BANDS: Record<MasteryBandName, { label: string; color: string }> = {
  strong: { label: 'Strong', color: bandColor.success },
  getting_there: { label: 'Getting there', color: bandColor.warning },
  needs_work: { label: 'Needs work', color: bandColor.danger },
}

/** Danger-tinted inline bar + mono percentage for wrong-answer rates (0–100). */
function WrongRateCell({ rate }: { rate: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-danger-soft">
        <span className="block h-full rounded-full bg-danger" style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} />
      </span>
      <span className="font-mono font-semibold text-danger">{formatPercent(rate, 1)}</span>
    </div>
  )
}

export interface OutcomesPillarProps {
  scope: AnalyticsScope
  /** Where an at-risk row drills into — school detail for HQ, section detail for managers. */
  atRiskHref: (row: AtRiskRow) => string
  /** Show the school column when the data spans schools (HQ, unscoped). */
  showSchool?: boolean
}

/**
 * The full outcomes pillar — shared by HQ `/analytics/outcomes` and the
 * School OS analytics page; only the at-risk drill-in target differs by role.
 */
export function OutcomesPillar({ scope, atRiskHref, showSchool = false }: OutcomesPillarProps) {
  const navigate = useNavigate()
  const outcomes = useOutcomesAnalytics(scope)
  const classes = useClasses()
  const classIds = useMemo(() => (classes.data ?? []).map((cls) => cls.id), [classes.data])
  const classNames = useMemo(() => new Map((classes.data ?? []).map((cls) => [cls.id, cls.name])), [classes.data])
  const subjectNames = useSubjectNames(classIds)
  const days = scope.days ?? 30

  const atRiskColumns = useMemo<Column<AtRiskRow>[]>(() => {
    const columns: Column<AtRiskRow>[] = []
    if (showSchool) {
      columns.push({
        key: 'school',
        header: 'School',
        render: (row) => <span className="font-semibold text-ink">{row.school_name}</span>,
        sortValue: (row) => row.school_name,
      })
    }
    columns.push(
      {
        key: 'section',
        header: 'Section',
        render: (row) => (showSchool ? row.section_label : <span className="font-semibold text-ink">{row.section_label}</span>),
        sortValue: (row) => row.section_label,
      },
      {
        key: 'class',
        header: 'Class',
        render: (row) => classNames.get(row.class_id) ?? row.class_id,
        sortValue: (row) => classNames.get(row.class_id) ?? row.class_id,
      },
      {
        key: 'at_risk',
        header: 'At risk',
        align: 'right',
        render: (row) => (
          <span className="font-mono font-semibold text-danger">
            {formatNumber(row.at_risk_count)} <span className="font-medium text-muted">of {formatNumber(row.student_count)}</span>
          </span>
        ),
        sortValue: (row) => row.at_risk_count,
      },
    )
    return columns
  }, [showSchool, classNames])

  const hotspotColumns = useMemo<Column<HotspotRow>[]>(
    () => [
      {
        key: 'chapter',
        header: 'Chapter',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.chapter_name}</p>
            <p className="truncate text-xs text-muted">{subjectNames.get(row.subject_id) ?? '—'}</p>
          </div>
        ),
        sortValue: (row) => row.chapter_name,
      },
      { key: 'attempts', header: 'Attempts', align: 'right', mono: true, render: (row) => formatNumber(row.attempts), sortValue: (row) => row.attempts },
      { key: 'wrong_rate', header: 'Wrong rate', align: 'right', render: (row) => <WrongRateCell rate={row.wrong_rate} />, sortValue: (row) => row.wrong_rate },
      { key: 'avg_score', header: 'Avg score', align: 'right', render: (row) => <ScoreBadge score={row.avg_evaluation_score} />, sortValue: (row) => row.avg_evaluation_score },
    ],
    [subjectNames],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Widget title="Score distribution" description={`AI evaluation scores, last ${days} days`} query={outcomes} className="lg:col-span-2">
          {(data) => <ScoreDistribution data={data.scores.distribution} emptyLabel="No evaluations in this window yet" />}
        </Widget>
        <Widget title="Mastery bands" description="Students by current topic mastery" query={outcomes}>
          {(data) => (
            <Donut
              data={data.mastery.distribution.map((band) => ({
                name: MASTERY_BANDS[band.band]?.label ?? band.band,
                value: band.students,
                color: MASTERY_BANDS[band.band]?.color,
              }))}
              centerLabel={formatCompact(data.mastery.distribution.reduce((sum, band) => sum + band.students, 0))}
              centerCaption="students"
              emptyLabel="No mastery data yet"
            />
          )}
        </Widget>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Widget title="Score trend" description="Average evaluation score and volume per day" query={outcomes} skeletonHeight={260}>
          {(data) => (
            <AreaTrend
              data={data.scores.trend.map((point) => ({ ...point }))}
              xKey="date"
              series={[
                { key: 'avg_score', label: 'Avg score' },
                { key: 'evaluations', label: 'Evaluations', yAxisId: 'right' },
              ]}
              height={220}
              emptyLabel="No evaluations in this window yet"
            />
          )}
        </Widget>
        <Widget title="Mastery movement" description="Average topic mastery per day" query={outcomes} skeletonHeight={260}>
          {(data) => (
            <div className="flex flex-col gap-2">
              <AreaTrend
                data={data.mastery.movement.map((point) => ({ ...point }))}
                xKey="date"
                series={[{ key: 'avg_mastery', label: 'Avg mastery' }]}
                height={200}
                emptyLabel="No mastery movement yet"
              />
              <p className="text-xs text-muted">Average mastery of topics practised each day. A movement proxy, not a cohort-wide average.</p>
            </div>
          )}
        </Widget>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-ink">At-risk sections</h2>
            <p className="mt-0.5 text-[13px] text-muted">Sections with students flagged for extra support. Click a row to drill in.</p>
          </div>
          <DataTable
            columns={atRiskColumns}
            rows={outcomes.data?.at_risk ?? []}
            rowKey={(row) => row.section_id}
            loading={outcomes.isPending}
            error={outcomes.isError ? apiErrorMessage(outcomes.error) : null}
            onRetry={() => void outcomes.refetch()}
            onRowClick={(row) => navigate(atRiskHref(row))}
            pageSize={8}
            initialSort={{ key: 'at_risk', direction: 'desc' }}
            emptyState={<EmptyState title="No sections at risk" description="No students are flagged for extra support in this window." />}
          />
        </section>
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-ink">Chapter hotspots</h2>
            <p className="mt-0.5 text-[13px] text-muted">Highest wrong-answer rates in range. Chapters need at least 20 attempts to qualify.</p>
          </div>
          <DataTable
            columns={hotspotColumns}
            rows={outcomes.data?.chapter_hotspots ?? []}
            rowKey={(row) => row.chapter_id}
            loading={outcomes.isPending}
            error={outcomes.isError ? apiErrorMessage(outcomes.error) : null}
            onRetry={() => void outcomes.refetch()}
            initialSort={{ key: 'wrong_rate', direction: 'desc' }}
            emptyState={<EmptyState title="No hotspots yet" description="Chapters appear here once quiz volume crosses 20 attempts in the window." />}
          />
        </section>
      </div>
    </div>
  )
}
