import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useChapters, useSubjects } from '@/api/queries/curriculum'
import { useCreateTlmOutlineJob, useTlmJob } from '@/api/queries/tlm'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Stepper } from '@/components/ui/Stepper'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { AiWorkingCard } from '@/features/hq/content/shared/AiWorkingCard'
import { TargetSectionsPicker } from '@/features/hq/content/shared/TargetSectionsPicker'
import { TLM_STEPS } from '@/features/hq/content/tlms/tlmMeta'

/** HQ /content/tlms/new — step one of the two-step TLM flow: scope it, enqueue the outline job, poll until the AI draft lands. */
export function TlmCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const createOutlineJob = useCreateTlmOutlineJob()
  const [jobId, setJobId] = useState<string | null>(null)
  const job = useTlmJob(jobId ?? undefined)

  const [sectionIds, setSectionIds] = useState<string[]>([])
  const [classId, setClassId] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState('')
  const [chapterIds, setChapterIds] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')

  const subjects = useSubjects(classId ?? undefined)
  const chapters = useChapters(subjectId || undefined)
  const sortedSubjects = useMemo(() => [...(subjects.data ?? [])].sort((a, b) => a.order - b.order), [subjects.data])
  const sortedChapters = useMemo(() => [...(chapters.data ?? [])].sort((a, b) => a.order - b.order), [chapters.data])

  function onTargetsChange(ids: string[], nextClassId: string | null) {
    setSectionIds(ids)
    if (nextClassId !== classId) {
      setSubjectId('')
      setChapterIds([])
    }
    setClassId(nextClassId)
  }

  const valid = sectionIds.length > 0 && Boolean(subjectId) && chapterIds.length > 0
  const jobFailed = jobId != null && (job.data?.status === 'failed' || job.isError)
  // Stays true through 'succeeded' — navigation to the drafted TLM unmounts this page.
  const working = createOutlineJob.isPending || (jobId != null && !jobFailed)

  useEffect(() => {
    if (job.data?.status !== 'succeeded' || !job.data.tlm_id) return
    void queryClient.invalidateQueries({ queryKey: ['tlms'] })
    toast.show('Outline drafted. Review it and steer with comments')
    navigate(`/content/tlms/${job.data.tlm_id}`)
  }, [job.data, queryClient, toast, navigate])

  async function onCreate() {
    if (!valid || working) return
    try {
      const created = await createOutlineJob.mutateAsync({
        title: title.trim() || null,
        section_ids: sectionIds,
        subjects: [{ subject_id: subjectId, chapter_ids: chapterIds }],
        prompt: prompt.trim() || null,
      })
      setJobId(created.job_id)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  function onRetry() {
    setJobId(null)
    void onCreate()
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[{ label: 'TLMs', to: '/content/tlms' }, { label: 'New' }]}
        title="New TLM"
        description="Pick who it's for and what it covers. AI drafts the outline, then you review, comment and generate the final module."
        actions={
          <Button icon={<Sparkles className="h-4 w-4" />} disabled={!valid} loading={working} onClick={() => void onCreate()}>
            Draft outline
          </Button>
        }
      />

      <Stepper steps={TLM_STEPS} current={0} className="max-w-xl" />

      {jobFailed ? (
        <ErrorState
          title="Outline generation failed"
          message={job.data?.error_message ?? (job.isError ? apiErrorMessage(job.error) : undefined)}
          onRetry={onRetry}
          className="rounded-card border border-hairline bg-surface"
        />
      ) : working ? (
        <AiWorkingCard
          title="Drafting the outline with AI"
          message={job.data?.progress_message ?? 'Reading the selected chapters and structuring the module, usually under a minute.'}
        />
      ) : null}

      <SectionCard title="Target sections" description="Which students get this study guide once it's shared">
        <TargetSectionsPicker selected={sectionIds} onChange={onTargetsChange} />
      </SectionCard>

      <SectionCard title="Coverage" description="Subject and chapters from the master curriculum, scoped to the targets' class">
        <div className="flex flex-col gap-4">
          <Select
            label="Subject"
            required
            value={subjectId}
            disabled={!classId}
            onChange={(event) => {
              setSubjectId(event.target.value)
              setChapterIds([])
            }}
            placeholder={classId ? (subjects.isPending ? 'Loading subjects…' : 'Pick a subject') : 'Pick target sections first'}
            options={sortedSubjects.map((subject) => ({ value: subject.id, label: `${subject.name} (${subject.code})` }))}
            className="sm:max-w-sm"
          />
          {subjectId ? (
            <fieldset className="rounded-card border border-hairline p-4">
              <legend className="px-1 text-[13px] font-bold text-ink">Chapters</legend>
              {chapters.isPending ? (
                <p className="text-[13px] text-muted">Loading chapters…</p>
              ) : sortedChapters.length === 0 ? (
                <p className="text-[13px] text-muted">No chapters in the fixtures for this subject yet.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {sortedChapters.map((chapter) => (
                    <Checkbox
                      key={chapter.id}
                      label={`${chapter.order}. ${chapter.name}`}
                      checked={chapterIds.includes(chapter.id)}
                      onChange={() =>
                        setChapterIds((prev) => (prev.includes(chapter.id) ? prev.filter((id) => id !== chapter.id) : [...prev, chapter.id]))
                      }
                    />
                  ))}
                </div>
              )}
            </fieldset>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Direction (optional)" description="A name and a steer for the AI. Leave blank and it names the module after the chapters">
        <div className="flex flex-col gap-4">
          <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Motion & Measurement: exam sprint" />
          <Textarea
            label="Prompt"
            rows={3}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Focus on solved numericals and common misconceptions; keep language simple."
          />
        </div>
      </SectionCard>
    </div>
  )
}
