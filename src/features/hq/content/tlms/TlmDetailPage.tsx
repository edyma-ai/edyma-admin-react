import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageSquarePlus, Send, Sparkles, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAddTlmComment, useCreateTlmFinalJob, useDeleteTlm, useRemoveTlmComment, useShareTlm, useTlm, useTlmJob } from '@/api/queries/tlm'
import { useSections } from '@/api/queries/sections'
import { AiBadge, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/Card'
import { CopyField } from '@/components/ui/CopyField'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { Stepper } from '@/components/ui/Stepper'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { Tlm, TlmModule } from '@/types/tlm'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { useSubjectNames } from '@/features/shared/assessments/useSubjectNames'
import { AiWorkingCard } from '@/features/hq/content/shared/AiWorkingCard'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'
import { featureGateMessage, FeatureGateNotice } from '@/features/hq/content/shared/FeatureGateNotice'
import { MarkdownView } from '@/features/hq/content/shared/MarkdownView'
import { useChapterNames } from '@/features/hq/content/shared/useChapterNames'
import { TlmStatusBadge, TLM_STEPS } from '@/features/hq/content/tlms/tlmMeta'

interface SectionCommentProps {
  tlmId: string
  heading: string
  existing: string | null
}

/** One review note per outline section — saved through POST/DELETE /tlm-modules/{id}/comments. */
function SectionComment({ tlmId, heading, existing }: SectionCommentProps) {
  const toast = useToast()
  const add = useAddTlmComment()
  const remove = useRemoveTlmComment()

  const [text, setText] = useState(existing ?? '')
  const [synced, setSynced] = useState(existing)
  if (existing !== synced) {
    // Render-time sync: another save (or a removal) changed the stored note.
    setSynced(existing)
    setText(existing ?? '')
  }

  const dirty = text.trim() !== (existing ?? '')

  async function save() {
    if (!text.trim()) return
    try {
      await add.mutateAsync({ tlmId, body: { section_heading: heading, comment: text.trim() } })
      toast.show('Note saved. It steers the final generation')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  async function clear() {
    try {
      await remove.mutateAsync({ tlmId, body: { section_heading: heading } })
      toast.show('Note removed')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <div className="mt-3 rounded-control border border-hairline bg-canvas/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <MessageSquarePlus aria-hidden className="h-3.5 w-3.5" /> Review note
        </p>
        {existing ? <IconButton label="Remove note" size="sm" variant="danger" icon={<Trash2 />} disabled={remove.isPending} onClick={() => void clear()} /> : null}
      </div>
      <Textarea
        aria-label={`Review note for ${heading}`}
        rows={2}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="e.g. Add two solved numericals here; keep the definitions shorter."
        className="mt-2"
      />
      {dirty && text.trim() ? (
        <Button size="sm" variant="secondary" className="mt-2" loading={add.isPending} onClick={() => void save()}>
          {existing ? 'Update note' : 'Save note'}
        </Button>
      ) : null}
    </div>
  )
}

function ModuleSections({ module, children }: { module: TlmModule; children?: (heading: string) => ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      {module.sections.map((section) => (
        <section key={section.heading} className="rounded-card border border-hairline p-4">
          <h3 className="text-sm font-bold tracking-tight text-ink">{section.heading}</h3>
          <MarkdownView markdown={section.content} className="mt-2" />
          {children?.(section.heading)}
        </section>
      ))}
    </div>
  )
}

/** HQ /content/tlms/:tlmId — outline review with comments, generate-final, share, and the shared reader. */
export function TlmDetailPage() {
  const { tlmId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const queryClient = useQueryClient()
  const tlm = useTlm(tlmId)
  const sections = useSections()
  const createFinalJob = useCreateTlmFinalJob()
  const [finalJobId, setFinalJobId] = useState<string | null>(null)
  const finalJob = useTlmJob(finalJobId ?? undefined)
  const share = useShareTlm()
  const remove = useDeleteTlm()
  const [confirm, setConfirm] = useState<'share' | 'delete' | null>(null)

  const finalJobFailed = finalJobId != null && (finalJob.data?.status === 'failed' || finalJob.isError)
  const generatingFinal = createFinalJob.isPending || (finalJobId != null && !finalJobFailed && finalJob.data?.status !== 'succeeded')

  // One toast + refetch per succeeded job — the ref keeps re-renders and refocus refetches from repeating it.
  const handledFinalJobRef = useRef<string | null>(null)
  useEffect(() => {
    if (!finalJobId || finalJob.data?.status !== 'succeeded' || handledFinalJobRef.current === finalJobId) return
    handledFinalJobRef.current = finalJobId
    void queryClient.invalidateQueries({ queryKey: ['tlms'] })
    toast.show('Final module generated. Preview it below, then share')
  }, [finalJobId, finalJob.data, queryClient, toast])

  const sectionLabels = useMemo(
    () => new Map((sections.data ?? []).map((section) => [section.id, `${section.class_name} ${section.label}`])),
    [sections.data],
  )
  const classIds = useMemo(() => {
    const byId = new Map((sections.data ?? []).map((section) => [section.id, section.class_id]))
    return [...new Set((tlm.data?.section_ids ?? []).map((id) => byId.get(id)).filter((id): id is string => Boolean(id)))].sort()
  }, [sections.data, tlm.data])
  const subjectNames = useSubjectNames(classIds)
  const chapterNames = useChapterNames(useMemo(() => (tlm.data?.subjects ?? []).map((row) => row.subject_id), [tlm.data]))

  async function onGenerateFinal() {
    if (!tlmId || generatingFinal) return
    try {
      const created = await createFinalJob.mutateAsync(tlmId)
      setFinalJobId(created.job_id)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  function onRetryFinal() {
    setFinalJobId(null)
    void onGenerateFinal()
  }

  async function onShare() {
    if (!tlmId) return
    try {
      await share.mutateAsync({ tlmId, body: {} })
      toast.show('TLM shared. Students in the targeted sections have been notified')
      setConfirm(null)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
      setConfirm(null)
    }
  }

  async function onDelete() {
    if (!tlmId) return
    try {
      await remove.mutateAsync(tlmId)
      toast.show('TLM deleted')
      navigate('/content/tlms')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
      setConfirm(null)
    }
  }

  if (tlm.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-7 w-96" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 w-full rounded-card lg:col-span-2" />
          <Skeleton className="h-72 w-full rounded-card" />
        </div>
      </div>
    )
  }
  if (tlm.isError) {
    const gate = featureGateMessage(tlm.error)
    if (gate) return <FeatureGateNotice feature="TLM study guides" />
    return <ErrorState message={apiErrorMessage(tlm.error)} onRetry={() => void tlm.refetch()} />
  }
  const data: Tlm | undefined = tlm.data
  if (!data) return <EmptyState title="TLM not found" description="It may have been deleted, or the link is stale." />

  const outline = data.modules[0]
  const finalModule = data.modules.length > 1 ? data.modules[data.modules.length - 1] : null
  const isShared = data.status === 'shared'
  const commentsByHeading = new Map((outline?.comments ?? []).map((comment) => [comment.section_heading, comment.user_comment]))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[{ label: 'TLMs', to: '/content/tlms' }, { label: data.title }]}
        title={
          <span className="inline-flex flex-wrap items-center gap-2.5">
            {data.title}
            <TlmStatusBadge status={data.status} />
          </span>
        }
        description="AI-generated study module. Every section below carries AI provenance."
        actions={
          <>
            {!isShared && finalModule ? (
              <Button icon={<Send className="h-4 w-4" />} onClick={() => setConfirm('share')}>
                Share with students
              </Button>
            ) : null}
            <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm('delete')}>
              Delete
            </Button>
          </>
        }
      />

      <Stepper steps={TLM_STEPS} current={isShared ? 3 : 1} className="max-w-xl" />

      {finalJobFailed ? (
        <ErrorState
          title="Final generation failed"
          message={finalJob.data?.error_message ?? (finalJob.isError ? apiErrorMessage(finalJob.error) : undefined)}
          onRetry={onRetryFinal}
          className="rounded-card border border-hairline bg-surface"
        />
      ) : generatingFinal ? (
        <AiWorkingCard
          title="Weaving your notes into the final module"
          message={finalJob.data?.progress_message ?? 'AI is regenerating each section with your review comments applied. This usually takes a minute or two.'}
        />
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {!isShared && outline ? (
            <SectionCard
              title={
                <span className="inline-flex items-center gap-2">
                  Outline <AiBadge />
                </span>
              }
              description="Leave a note on any section to steer it, then generate the final module"
              actions={
                <Button
                  size="sm"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  loading={generatingFinal}
                  onClick={() => void onGenerateFinal()}
                >
                  {finalModule ? 'Regenerate final' : 'Generate final'}
                </Button>
              }
            >
              <ModuleSections module={outline}>
                {(heading) => <SectionComment tlmId={data.id} heading={heading} existing={commentsByHeading.get(heading) ?? null} />}
              </ModuleSections>
            </SectionCard>
          ) : null}

          {finalModule ? (
            <SectionCard
              title={
                <span className="inline-flex items-center gap-2">
                  Final module <AiBadge />
                </span>
              }
              description={isShared ? 'Live in students’ study guides for the covered chapters' : 'Preview. Students see this once you share'}
            >
              <ModuleSections module={finalModule} />
            </SectionCard>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title="Targets" description="Sections that receive this module">
            <div className="flex flex-wrap gap-1.5">
              {data.section_ids.map((id) => (
                <Badge key={id} tone="neutral">
                  {sectionLabels.get(id) ?? id}
                </Badge>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Coverage" description="Curriculum this module draws from">
            <div className="flex flex-col gap-3">
              {data.subjects.map((row) => (
                <div key={row.subject_id}>
                  <p className="text-[13px] font-semibold text-ink">{subjectNames.get(row.subject_id) ?? row.subject_id}</p>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {row.chapter_ids.map((chapterId) => (
                      <li key={chapterId} className="text-xs text-muted">
                        {chapterNames.get(chapterId) ?? <span className="font-mono">{chapterId}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Metadata" description="Ids for support and debugging">
            <div className="flex flex-col gap-3.5">
              <CopyField label="TLM id" value={data.id} />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Created</dt>
                  <dd className="mt-0.5">
                    <Timestamp at={data.created_at} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Updated</dt>
                  <dd className="mt-0.5">
                    <Timestamp at={data.updated_at} />
                  </dd>
                </div>
              </dl>
            </div>
          </SectionCard>
        </div>
      </div>

      {confirm === 'share' ? (
        <ConfirmModal
          title="Share this module?"
          description={`Students in ${data.section_ids.length} section${data.section_ids.length === 1 ? '' : 's'} are notified and see it in their study guides. Sharing locks the outline and its notes.`}
          confirmLabel="Share & notify"
          loading={share.isPending}
          onConfirm={() => void onShare()}
          onClose={() => setConfirm(null)}
        />
      ) : null}
      {confirm === 'delete' ? (
        <ConfirmModal
          title="Delete this TLM?"
          description={isShared ? 'It disappears from students’ study guides immediately. This can’t be undone from the console.' : 'The outline, notes and any generated final module are removed.'}
          confirmLabel="Delete TLM"
          tone="danger"
          loading={remove.isPending}
          onConfirm={() => void onDelete()}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </div>
  )
}
