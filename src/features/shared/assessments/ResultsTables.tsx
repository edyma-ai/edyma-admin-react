/* eslint-disable react-refresh/only-export-components -- the evaluation helpers travel with the tables that consume them */
import { useMemo } from 'react'
import { Badge, ScoreBadge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tooltip } from '@/components/ui/Tooltip'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import type { EvaluationDoc, SubmissionDoc } from '@/types/assessments'

/** The overall (non-per-question) evaluation rows — one per student. */
export function overallEvaluations(rows: EvaluationDoc[] | undefined): EvaluationDoc[] {
  return (rows ?? []).filter((row) => row.question_id == null)
}

export function averageOverallScore(rows: EvaluationDoc[]): { scored: number; average: number | null } {
  const scored = rows.filter((row) => row.overall_score != null)
  const average = scored.length > 0 ? scored.reduce((sum, row) => sum + (row.overall_score ?? 0), 0) / scored.length : null
  return { scored: scored.length, average }
}

function StudentNameCell({ studentId, name }: { studentId: string; name: string | null }) {
  if (name) return <span className="font-semibold text-ink">{name}</span>
  // Name unavailable (payload field null, lookup still loading, or the roster call failed) — show the id, explained on hover.
  return (
    <Tooltip content="Student name unavailable, showing the account id">
      <span className="font-mono text-xs text-muted">{studentId}</span>
    </Tooltip>
  )
}

interface ResultsTableProps {
  loading: boolean
  error: string | null
  onRetry: () => void
  /** student_id → display name fallback; evaluation rows prefer the payload's student_name. Ids render in mono when no name resolves. */
  studentNames: Map<string, string>
}

export interface SubmissionsTableProps extends ResultsTableProps {
  rows: SubmissionDoc[]
  sectionLabels: Map<string, string>
}

/** Student submissions across an assessment's targeted sections. */
export function SubmissionsTable({ rows, loading, error, onRetry, studentNames, sectionLabels }: SubmissionsTableProps) {
  const columns = useMemo<Column<SubmissionDoc>[]>(
    () => [
      {
        key: 'student',
        header: 'Student',
        render: (row) => <StudentNameCell studentId={row.student_id} name={studentNames.get(row.student_id) ?? null} />,
        sortValue: (row) => studentNames.get(row.student_id) ?? row.student_id,
      },
      {
        key: 'section',
        header: 'Section',
        render: (row) =>
          row.section_id && sectionLabels.get(row.section_id) ? <Badge tone="neutral">{sectionLabels.get(row.section_id)}</Badge> : <span className="text-muted">—</span>,
      },
      {
        key: 'submitted',
        header: 'Submitted',
        align: 'right',
        render: (row) => <Timestamp at={row.created_at} />,
        sortValue: (row) => row.created_at,
      },
    ],
    [studentNames, sectionLabels],
  )

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      pageSize={10}
      initialSort={{ key: 'submitted', direction: 'desc' }}
      emptyState={<EmptyState title="No submissions yet" description="Submissions appear as students attempt this assessment." />}
    />
  )
}

export interface EvaluationsTableProps extends ResultsTableProps {
  /** Overall evaluation rows only — pass through `overallEvaluations()` first. */
  rows: EvaluationDoc[]
}

/** Overall AI evaluations per student, on the 4-band score scale. */
export function EvaluationsTable({ rows, loading, error, onRetry, studentNames }: EvaluationsTableProps) {
  const columns = useMemo<Column<EvaluationDoc>[]>(
    () => [
      {
        key: 'student',
        header: 'Student',
        // The payload's server-resolved name wins; the client-side roster lookup covers older rows where it is null.
        render: (row) => <StudentNameCell studentId={row.student_id} name={row.student_name ?? studentNames.get(row.student_id) ?? null} />,
        sortValue: (row) => row.student_name ?? studentNames.get(row.student_id) ?? row.student_id,
      },
      {
        key: 'score',
        header: 'Score',
        align: 'right',
        render: (row) =>
          row.overall_score != null ? (
            <ScoreBadge score={row.overall_score} />
          ) : row.job_status === 'failed' ? (
            <Badge tone="danger">Failed</Badge>
          ) : (
            <Badge tone="neutral">{row.job_status ?? 'pending'}</Badge>
          ),
        sortValue: (row) => row.overall_score ?? -1,
      },
      {
        key: 'evaluated',
        header: 'Evaluated',
        align: 'right',
        render: (row) => <Timestamp at={row.updated_at} />,
        sortValue: (row) => row.updated_at,
      },
    ],
    [studentNames],
  )

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      pageSize={10}
      initialSort={{ key: 'score', direction: 'desc' }}
      emptyState={<EmptyState title="No evaluations yet" description="Evaluations appear once submissions are graded." />}
    />
  )
}
