import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, FileText, Trash2 } from 'lucide-react'
import { useCreatePaperExtraction, usePaperExtractionJob } from '@/api/queries/assessments'
import { usePresignUpload } from '@/api/queries/ops'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { ErrorState } from '@/components/ui/ErrorState'
import { FileDrop } from '@/components/ui/FileDrop'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { PaperExtractionJob } from '@/types/assessments'
import { QUESTION_TYPE_LABELS } from '@/features/shared/assessments/QuestionList'
import { AiWorkingCard } from '@/features/hq/content/shared/AiWorkingCard'
import { draftFromExtracted, type QuestionDraft } from '@/features/hq/content/assessments/questionDrafts'

const ACCEPTED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg'])

export interface PaperExtractionModalProps {
  /** Hints forwarded to the extractor, prefilled from the form's subject/class. */
  subjectHint?: string
  gradeHint?: string
  onMerge: (questions: QuestionDraft[]) => void
  onClose: () => void
}

function PageNotes({ job }: { job: PaperExtractionJob }) {
  const noteworthy = job.per_page_status.filter((page) => page.status !== 'ok' || page.notes)
  if (noteworthy.length === 0) return null
  return (
    <div className="rounded-control border border-warning/40 bg-warning-soft p-3">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-warning">
        <AlertTriangle aria-hidden className="h-4 w-4" /> Check these pages before merging
      </p>
      <ul className="mt-1.5 flex flex-col gap-1 text-xs text-muted">
        {noteworthy.map((page) => (
          <li key={page.page_index}>
            <span className="font-mono font-semibold">Page {page.page_index + 1}:</span> {page.status !== 'ok' ? (page.error ?? 'extraction failed') : page.notes}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ReviewRow({
  draft,
  included,
  onToggle,
  onTextChange,
}: {
  draft: QuestionDraft
  included: boolean
  onToggle: () => void
  onTextChange: (text: string) => void
}) {
  return (
    <li className="rounded-card border border-hairline p-3.5">
      <div className="flex items-center gap-2">
        <Checkbox checked={included} onChange={onToggle} aria-label="Include this question" />
        <Badge tone="sky">{QUESTION_TYPE_LABELS[draft.type]}</Badge>
        <Badge tone="info">From paper</Badge>
      </div>
      <Textarea
        aria-label="Extracted question text"
        rows={2}
        value={draft.text}
        onChange={(event) => onTextChange(event.target.value)}
        className="mt-2.5"
        disabled={!included}
      />
      {draft.options.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {draft.options.map((option) => {
            const correct = draft.correctOptions.includes(option.id)
            return (
              <li key={option.id} className={correct ? 'flex items-center gap-1.5 text-xs font-semibold text-success' : 'flex items-center gap-1.5 text-xs text-muted'}>
                {correct ? <Check aria-hidden className="h-3 w-3 shrink-0" /> : <span aria-hidden className="h-3 w-3 shrink-0" />}
                <span className="font-mono uppercase">{option.id}.</span>
                <span className="min-w-0">{option.text}</span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </li>
  )
}

/**
 * "Snap a paper": upload pages via presigned S3 PUTs, kick off the extraction
 * job, poll with progress, then review/edit the extracted questions before
 * merging them into the builder.
 */
export function PaperExtractionModal({ subjectHint = '', gradeHint = '', onMerge, onClose }: PaperExtractionModalProps) {
  const toast = useToast()
  const presign = usePresignUpload()
  const createJob = useCreatePaperExtraction()

  const [files, setFiles] = useState<File[]>([])
  const [subject, setSubject] = useState(subjectHint)
  const [grade, setGrade] = useState(gradeHint)
  const [uploadDone, setUploadDone] = useState<number | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<QuestionDraft[] | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  const job = usePaperExtractionJob(jobId ?? undefined)

  useEffect(() => {
    if (job.data?.status === 'succeeded' && drafts === null) {
      setDrafts(job.data.extracted_questions.map(draftFromExtracted))
    }
  }, [job.data, drafts])

  function addFile(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_EXTENSIONS.has(extension)) {
      toast.show('Only PDF, PNG and JPG pages can be extracted', 'error')
      return
    }
    setFiles((prev) => [...prev, file])
  }

  async function startExtraction() {
    setUploadDone(0)
    try {
      const keys: string[] = []
      for (const [index, file] of files.entries()) {
        setUploadDone(index)
        const extension = file.name.split('.').pop() ?? ''
        const grant = await presign.mutateAsync({ extension, purpose: 'paper_extraction' })
        // Plain fetch on purpose — the axios client would attach the JWT, and
        // an Authorization header breaks the presigned-URL signature.
        const put = await fetch(grant.upload_url, { method: 'PUT', headers: { 'Content-Type': grant.content_type }, body: file })
        if (!put.ok) throw new Error(`Upload failed for ${file.name} (${put.status})`)
        keys.push(grant.key)
      }
      setUploadDone(files.length)
      const created = await createJob.mutateAsync({ s3_keys: keys, subject: subject.trim() || null, grade_level: grade.trim() || null })
      setJobId(created.job_id)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
      setUploadDone(null)
    }
  }

  function reset() {
    setJobId(null)
    setDrafts(null)
    setExcluded(new Set())
    setUploadDone(null)
  }

  const included = useMemo(() => (drafts ?? []).filter((draft) => !excluded.has(draft.key)), [drafts, excluded])
  const uploading = uploadDone != null && !jobId
  const working = uploading || (jobId != null && drafts === null && job.data?.status !== 'failed' && !job.isError)

  let body: ReactNode
  if (drafts !== null) {
    body = (
      <div className="flex flex-col gap-3">
        {job.data ? <PageNotes job={job.data} /> : null}
        {drafts.length === 0 ? (
          <p className="rounded-card border border-dashed border-hairline px-4 py-6 text-center text-[13px] text-muted">
            No questions could be read from this paper. Try clearer scans, one page per image.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {drafts.map((draft) => (
              <ReviewRow
                key={draft.key}
                draft={draft}
                included={!excluded.has(draft.key)}
                onToggle={() =>
                  setExcluded((prev) => {
                    const next = new Set(prev)
                    if (next.has(draft.key)) next.delete(draft.key)
                    else next.add(draft.key)
                    return next
                  })
                }
                onTextChange={(text) => setDrafts((prev) => (prev ?? []).map((row) => (row.key === draft.key ? { ...row, text } : row)))}
              />
            ))}
          </ul>
        )}
      </div>
    )
  } else if (jobId && (job.data?.status === 'failed' || job.isError)) {
    body = (
      <ErrorState
        title="Extraction failed"
        message={job.data?.error_message ?? (job.isError ? apiErrorMessage(job.error) : undefined)}
        onRetry={reset}
      />
    )
  } else if (working) {
    body = (
      <AiWorkingCard
        title={uploading ? 'Uploading pages…' : 'Reading the paper with AI'}
        message={uploading ? `Page ${Math.min((uploadDone ?? 0) + 1, files.length)} of ${files.length}` : (job.data?.progress?.message ?? 'Queued. This usually takes under a minute per page.')}
        done={uploading ? uploadDone : job.data?.progress?.done}
        total={uploading ? files.length : job.data?.progress?.total}
      />
    )
  } else {
    body = (
      <div className="flex flex-col gap-4">
        <FileDrop
          onFile={addFile}
          accept=".pdf,.png,.jpg,.jpeg"
          title="Drop a page here, or click to browse"
          hint="PDF for multi-page papers; PNG/JPG for photos. Add pages in paper order"
        />
        {files.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center gap-2.5 rounded-control border border-hairline px-3 py-2">
                <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{file.name}</span>
                <span className="font-mono text-xs text-muted">p{index + 1}</span>
                <IconButton label={`Remove ${file.name}`} size="sm" variant="danger" icon={<Trash2 />} onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))} />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Subject hint" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Mathematics" hint="Optional, helps the extractor" />
          <Input label="Grade hint" value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="8th" hint="Optional" />
        </div>
      </div>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Extract from a printed paper"
      description="AI reads the uploaded pages into structured questions you can review and merge into the builder."
      footer={
        drafts !== null ? (
          <>
            <Button variant="secondary" onClick={reset}>
              Start over
            </Button>
            <Button disabled={included.length === 0} onClick={() => onMerge(included)}>
              Merge {included.length} question{included.length === 1 ? '' : 's'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={working}>
              Cancel
            </Button>
            <Button disabled={files.length === 0 || working} loading={working} onClick={() => void startExtraction()}>
              Extract questions
            </Button>
          </>
        )
      }
    >
      {body}
    </Modal>
  )
}
