import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Send, Trash2 } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useAssessment, useAssessmentEvaluations, useAssessmentSubmissions, useDeleteAssessment, useUpdateAssessment } from '@/api/queries/assessments'
import { useSections } from '@/api/queries/sections'
import { useAdminUsers } from '@/api/queries/users'
import { AiBadge, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/Card'
import { CopyField } from '@/components/ui/CopyField'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatDate, formatNumber } from '@/lib/format'
import { AssessmentStatusBadge } from '@/features/shared/assessments/AssessmentBadges'
import { QuestionList } from '@/features/shared/assessments/QuestionList'
import { averageOverallScore, EvaluationsTable, overallEvaluations, SubmissionsTable } from '@/features/shared/assessments/ResultsTables'
import { useSubjectNames } from '@/features/shared/assessments/useSubjectNames'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'
import { featureGateMessage, FeatureGateNotice } from '@/features/hq/content/shared/FeatureGateNotice'

/** HQ /content/assessments/:assessmentId — the author's view: questions with answers, results, publish/delete. */
export function ContentAssessmentDetailPage() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user: me } = useAuth()

  const assessment = useAssessment(assessmentId)
  const submissions = useAssessmentSubmissions(assessmentId)
  const evaluations = useAssessmentEvaluations(assessmentId)
  const sections = useSections()
  // Content managers can't read /admin/users — student rows degrade to mono ids.
  const students = useAdminUsers({ role: 'student' }, me?.role === 'super_admin')
  const publish = useUpdateAssessment(assessmentId ?? '')
  const remove = useDeleteAssessment()

  const [confirm, setConfirm] = useState<'publish' | 'delete' | null>(null)

  const classIds = useMemo(() => (assessment.data?.class_id ? [assessment.data.class_id] : []), [assessment.data])
  const subjectNames = useSubjectNames(classIds)
  const sectionLabels = useMemo(
    () => new Map((sections.data ?? []).map((section) => [section.id, `${section.class_name} ${section.label}`])),
    [sections.data],
  )
  const studentNames = useMemo(() => new Map((students.data ?? []).map((student) => [student.id, student.display_name])), [students.data])

  const overall = useMemo(() => overallEvaluations(evaluations.data), [evaluations.data])
  const { scored, average } = averageOverallScore(overall)

  async function onPublish() {
    try {
      await publish.mutateAsync({ status: 'published' })
      toast.show('Assessment published. Students have been notified')
      setConfirm(null)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
      setConfirm(null)
    }
  }

  async function onDelete() {
    if (!assessmentId) return
    try {
      await remove.mutateAsync(assessmentId)
      toast.show('Assessment deleted')
      navigate('/content/assessments')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
      setConfirm(null)
    }
  }

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
    const gate = featureGateMessage(assessment.error)
    if (gate) return <FeatureGateNotice feature="Assessments" />
    return <ErrorState message={apiErrorMessage(assessment.error)} onRetry={() => void assessment.refetch()} />
  }
  const data = assessment.data
  if (!data) return <EmptyState title="Assessment not found" description="It may have been deleted, or the link is stale." />

  const subject = subjectNames.get(data.subject_id) ?? data.subject_id
  const description = [subject, data.due_date ? `Due ${formatDate(data.due_date)}` : null].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Assessments', to: '/content/assessments' }, { label: data.title }]}
        title={
          <span className="inline-flex flex-wrap items-center gap-2.5">
            {data.title}
            <AssessmentStatusBadge status={data.status} />
          </span>
        }
        description={description}
        actions={
          <>
            {data.status === 'draft' ? (
              <Button icon={<Send className="h-4 w-4" />} onClick={() => setConfirm('publish')}>
                Publish
              </Button>
            ) : null}
            <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm('delete')}>
              Delete
            </Button>
          </>
        }
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
          <SectionCard title="Questions" description={`${formatNumber(data.questions.length)} question${data.questions.length === 1 ? '' : 's'}. Answers visible to authors only`}>
            <QuestionList questions={data.questions} showAnswers />
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

          <SectionCard title="Metadata" description="Ids for support and debugging">
            <div className="flex flex-col gap-3.5">
              <CopyField label="Assessment id" value={data.id} />
              <CopyField label="Subject id" value={data.subject_id} />
              {data.chapter_id ? <CopyField label="Chapter id" value={data.chapter_id} /> : null}
            </div>
          </SectionCard>
        </div>
      </div>

      {confirm === 'publish' ? (
        <ConfirmModal
          title="Publish this assessment?"
          description={`Publishing makes it live in ${data.section_ids.length} section${data.section_ids.length === 1 ? '' : 's'} and notifies every enrolled student.`}
          confirmLabel="Publish & notify"
          loading={publish.isPending}
          onConfirm={() => void onPublish()}
          onClose={() => setConfirm(null)}
        />
      ) : null}
      {confirm === 'delete' ? (
        <ConfirmModal
          title="Delete this assessment?"
          description={
            data.status === 'published'
              ? 'It disappears from students’ apps immediately, along with its place in their to-do lists. Submissions stay stored.'
              : 'This draft and its questions are removed. This can’t be undone from the console.'
          }
          confirmLabel="Delete assessment"
          tone="danger"
          loading={remove.isPending}
          onConfirm={() => void onDelete()}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </div>
  )
}
