import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, Send } from 'lucide-react'
import { useCreateAssessment } from '@/api/queries/assessments'
import { useChapters, useClasses, useSubjects } from '@/api/queries/curriculum'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { AssessmentStatus } from '@/types/assessments'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'
import { TargetSectionsPicker } from '@/features/hq/content/shared/TargetSectionsPicker'
import { PaperExtractionModal } from '@/features/hq/content/assessments/PaperExtractionModal'
import { QuestionBuilder } from '@/features/hq/content/assessments/QuestionBuilder'
import { draftError, draftToBody, type QuestionDraft } from '@/features/hq/content/assessments/questionDrafts'

/** HQ /content/assessments/new — full-page authoring form over POST /assessments. */
export function AssessmentCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const createAssessment = useCreateAssessment()

  const [sectionIds, setSectionIds] = useState<string[]>([])
  const [classId, setClassId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [due, setDue] = useState('')
  const [questions, setQuestions] = useState<QuestionDraft[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [extracting, setExtracting] = useState(false)

  const classes = useClasses()
  const subjects = useSubjects(classId ?? undefined)
  const chapters = useChapters(subjectId || undefined)

  const sortedSubjects = useMemo(() => [...(subjects.data ?? [])].sort((a, b) => a.order - b.order), [subjects.data])
  const sortedChapters = useMemo(() => [...(chapters.data ?? [])].sort((a, b) => a.order - b.order), [chapters.data])

  function onTargetsChange(ids: string[], nextClassId: string | null) {
    setSectionIds(ids)
    if (nextClassId !== classId) {
      setSubjectId('')
      setChapterId('')
    }
    setClassId(nextClassId)
  }

  function validationError(status: AssessmentStatus): string | null {
    if (sectionIds.length === 0) return 'Pick at least one target section'
    if (!subjectId) return 'Pick a subject'
    if (!chapterId) return 'Pick a chapter'
    if (!title.trim()) return 'Give the assessment a title'
    if (questions.some((draft) => draftError(draft) != null)) return 'Fix the highlighted questions first'
    if (status === 'published' && questions.length === 0) return 'Add at least one question before publishing'
    return null
  }

  async function save(status: AssessmentStatus) {
    setShowErrors(true)
    const problem = validationError(status)
    if (problem) {
      toast.show(problem, 'error')
      setConfirmPublish(false)
      return
    }
    try {
      const created = await createAssessment.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        subject_id: subjectId,
        chapter_id: chapterId,
        section_ids: sectionIds,
        due_date: due ? new Date(due).getTime() : null,
        status,
        questions: questions.map(draftToBody),
      })
      toast.show(status === 'published' ? 'Assessment published. Students have been notified' : 'Draft saved')
      navigate(`/content/assessments/${created.id}`)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
      setConfirmPublish(false)
    }
  }

  function onPublishClick() {
    setShowErrors(true)
    const problem = validationError('published')
    if (problem) {
      toast.show(problem, 'error')
      return
    }
    setConfirmPublish(true)
  }

  const subjectName = sortedSubjects.find((subject) => subject.id === subjectId)?.name
  const classLevel = classes.data?.find((cls) => cls.id === classId)?.level

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[{ label: 'Assessments', to: '/content/assessments' }, { label: 'New' }]}
        title="New assessment"
        description="Target sections, pick the chapter, build the paper, then save as a draft or publish straight to students."
        actions={
          <>
            <Button variant="secondary" loading={createAssessment.isPending && !confirmPublish} onClick={() => void save('draft')}>
              Save draft
            </Button>
            <Button icon={<Send className="h-4 w-4" />} onClick={onPublishClick}>
              Publish
            </Button>
          </>
        }
      />

      <SectionCard title="Target sections" description="Who takes this assessment: cohorts on the retail tenant or a school's sections">
        <TargetSectionsPicker selected={sectionIds} onChange={onTargetsChange} />
      </SectionCard>

      <SectionCard title="Curriculum" description="Subject and chapter from the master curriculum, scoped to the targets' class">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Subject"
            required
            value={subjectId}
            disabled={!classId}
            onChange={(event) => {
              setSubjectId(event.target.value)
              setChapterId('')
            }}
            placeholder={classId ? (subjects.isPending ? 'Loading subjects…' : 'Pick a subject') : 'Pick target sections first'}
            options={sortedSubjects.map((subject) => ({ value: subject.id, label: `${subject.name} (${subject.code})` }))}
          />
          <Select
            label="Chapter"
            required
            value={chapterId}
            disabled={!subjectId}
            onChange={(event) => setChapterId(event.target.value)}
            placeholder={subjectId ? (chapters.isPending ? 'Loading chapters…' : 'Pick a chapter') : 'Pick a subject first'}
            options={sortedChapters.map((chapter) => ({ value: chapter.id, label: `${chapter.order}. ${chapter.name}` }))}
          />
        </div>
      </SectionCard>

      <SectionCard title="Details" description="What students see at the top of the assessment">
        <div className="flex flex-col gap-4">
          <Input label="Title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ch 4: Motion and Measurement checkpoint" />
          <Textarea label="Description (optional)" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Covers sections 4.1–4.3; MCQs plus two written answers." />
          <Input label="Due date (optional)" type="datetime-local" className="sm:max-w-xs" value={due} onChange={(event) => setDue(event.target.value)} hint="Shown to students; nothing locks after it passes." />
        </div>
      </SectionCard>

      <SectionCard
        title="Questions"
        description="Text, MCQ and file-upload questions. AI evaluates against the correct options or expected answers"
        actions={
          <Button variant="secondary" size="sm" icon={<ScanLine className="h-3.5 w-3.5" />} onClick={() => setExtracting(true)}>
            Extract from paper
          </Button>
        }
      >
        <QuestionBuilder questions={questions} onChange={setQuestions} showErrors={showErrors} />
      </SectionCard>

      {confirmPublish ? (
        <ConfirmModal
          title="Publish this assessment?"
          description={`Publishing makes it live in ${sectionIds.length} section${sectionIds.length === 1 ? '' : 's'} and notifies every enrolled student. You can't unpublish from the console.`}
          confirmLabel="Publish & notify"
          loading={createAssessment.isPending}
          onConfirm={() => void save('published')}
          onClose={() => setConfirmPublish(false)}
        />
      ) : null}

      {extracting ? (
        <PaperExtractionModal
          subjectHint={subjectName}
          gradeHint={classLevel != null ? `Class ${classLevel}` : undefined}
          onMerge={(merged) => {
            setQuestions((prev) => [...prev, ...merged])
            setExtracting(false)
            toast.show(`${merged.length} question${merged.length === 1 ? '' : 's'} merged into the builder`)
          }}
          onClose={() => setExtracting(false)}
        />
      ) : null}
    </div>
  )
}
