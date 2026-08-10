import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAssessment, useAssessmentEvaluations, useAssessmentSubmissions } from '@/api/queries/assessments'
import { useSections } from '@/api/queries/sections'
import { useAdminUsers } from '@/api/queries/users'
import { AiBadge, Badge } from '@/components/ui/Badge'
import { SectionCard } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { apiErrorMessage } from '@/lib/apiError'
import { formatDate, formatNumber } from '@/lib/format'
import type { Assessment } from '@/types/assessments'
import { AssessmentStatusBadge } from '@/features/shared/assessments/AssessmentBadges'
import { QuestionList } from '@/features/shared/assessments/QuestionList'
import { averageOverallScore, EvaluationsTable, overallEvaluations, SubmissionsTable } from '@/features/shared/assessments/ResultsTables'
import { useSubjectNames } from '@/features/shared/assessments/useSubjectNames'

/** School OS /assessments/:assessmentId — read-only questions, submissions and AI evaluations. */
export function AssessmentDetailPage() {
  const { assessmentId } = useParams()
  const assessment = useAssessment(assessmentId)
  const submissions = useAssessmentSubmissions(assessmentId)
  const evaluations = useAssessmentEvaluations(assessmentId)
  const sections = useSections()
  // Evaluations carry server-resolved student_name, but submissions do not — the roster lookup stays for the submissions table.
  const students = useAdminUsers({ role: 'student' })

  const classIds = useMemo(() => (assessment.data?.class_id ? [assessment.data.class_id] : []), [assessment.data])
  const subjectNames = useSubjectNames(classIds)

  const sectionLabels = useMemo(
    () => new Map((sections.data ?? []).map((section) => [section.id, `${section.class_name} ${section.label}`])),
    [sections.data],
  )
  const studentNames = useMemo(() => new Map((students.data ?? []).map((student) => [student.id, student.display_name])), [students.data])

  const overall = useMemo(() => overallEvaluations(evaluations.data), [evaluations.data])
  const { scored, average } = averageOverallScore(overall)

  if (assessment.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-card lg:col-span-2" />
          <Skeleton className="h-80 w-full rounded-card" />
        </div>
      </div>
    )
  }
  if (assessment.isError) {
    return <ErrorState message={apiErrorMessage(assessment.error)} onRetry={() => void assessment.refetch()} />
  }
  const data: Assessment | undefined = assessment.data
  if (!data) return <EmptyState title="Assessment not found" description="It may have been removed, or the link is stale." />

  const subject = subjectNames.get(data.subject_id) ?? data.subject_id
  const description = [subject, data.due_date ? `Due ${formatDate(data.due_date)}` : null].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Assessments', to: '/assessments' }, { label: data.title }]}
        title={
          <span className="inline-flex flex-wrap items-center gap-2.5">
            {data.title}
            <AssessmentStatusBadge status={data.status} />
          </span>
        }
        description={description}
      />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-[15px] font-bold tracking-tight text-ink">Submissions</h2>
              <p className="mt-0.5 text-[13px] text-muted">Student submissions across the targeted sections.</p>
            </div>
            <SubmissionsTable
              rows={submissions.data ?? []}
              loading={submissions.isPending}
              error={submissions.isError ? apiErrorMessage(submissions.error) : null}
              onRetry={() => void submissions.refetch()}
              studentNames={studentNames}
              sectionLabels={sectionLabels}
            />
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="inline-flex items-center gap-2 text-[15px] font-bold tracking-tight text-ink">
                Evaluations <AiBadge>AI evaluated</AiBadge>
              </h2>
              <p className="mt-0.5 text-[13px] text-muted">
                {average != null ? `${formatNumber(scored)} scored · average ${Math.round(average)}%` : 'Overall AI evaluation per student.'}
              </p>
            </div>
            <EvaluationsTable
              rows={overall}
              loading={evaluations.isPending}
              error={evaluations.isError ? apiErrorMessage(evaluations.error) : null}
              onRetry={() => void evaluations.refetch()}
              studentNames={studentNames}
            />
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title="Questions" description={`${formatNumber(data.questions.length)} question${data.questions.length === 1 ? '' : 's'} in this paper`}>
            <QuestionList questions={data.questions} />
          </SectionCard>

          <SectionCard title="Targets" description="Sections this assessment is assigned to">
            <div className="flex flex-wrap gap-1.5">
              {data.section_ids.length === 0 ? (
                <p className="text-[13px] text-muted">No sections targeted.</p>
              ) : (
                data.section_ids.map((id) => (
                  <Badge key={id} tone="neutral">
                    {sectionLabels.get(id) ?? id}
                  </Badge>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
