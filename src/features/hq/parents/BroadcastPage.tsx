import { useMemo, useState } from 'react'
import { AlertTriangle, Megaphone } from 'lucide-react'
import { useBroadcast, useNoticeTemplates, useParentCommsJob, useParentContacts, useUploadNoticeMedia } from '@/api/queries/parentComms'
import { useSchools } from '@/api/queries/schools'
import { useSections } from '@/api/queries/sections'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { FileDrop } from '@/components/ui/FileDrop'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { AudienceType, MediaAttachment } from '@/types/parentComms'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'
import { allFilled, humanise, mediaHeaderProblem, mediaHeaderRule, submittableValues } from '@/features/hq/parents/templateForm'
import { TemplateFields, TemplatePreview, UnapprovedTemplateWarning } from '@/features/hq/parents/templateFields'

/**
 * Notices to parents, composed from an approved WhatsApp template.
 *
 * There is no free-form box any more. A notice reaches parents who have not
 * messaged us, where WhatsApp permits nothing but an approved template, so
 * free-form text was a message that looked sent and never arrived.
 *
 * The picker and the form are built from `GET /parent-comms/templates`, not
 * from a list held here: the catalogue is master data, and a template added to
 * the backend fixture has to appear without a frontend release.
 */

export function ParentBroadcastPage() {
  const toast = useToast()
  const [audienceType, setAudienceType] = useState<AudienceType>('school')
  const [schoolId, setSchoolId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [media, setMedia] = useState<MediaAttachment | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  const schools = useSchools()
  const sections = useSections(schoolId, Boolean(schoolId))
  const contacts = useParentContacts(audienceType === 'students' ? undefined : schoolId || undefined)
  const noticeTemplates = useNoticeTemplates()
  const broadcast = useBroadcast()
  const uploadMedia = useUploadNoticeMedia()
  const job = useParentCommsJob(jobId)

  const template = useMemo(() => (noticeTemplates.data ?? []).find((entry) => entry.code === templateCode), [noticeTemplates.data, templateCode])

  const searchable = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = (contacts.data ?? []).filter((c) => c.parent_whatsapp && !c.parent_opted_out)
    return term ? rows.filter((c) => c.student_name.toLowerCase().includes(term) || (c.parent_name ?? '').toLowerCase().includes(term)) : rows
  }, [contacts.data, search])

  const recipientCount =
    audienceType === 'students' ? picked.length : audienceType === 'section' ? '-' : (contacts.data ?? []).filter((c) => c.parent_whatsapp && !c.parent_opted_out).length

  const audienceChosen = audienceType === 'school' ? Boolean(schoolId) : audienceType === 'section' ? Boolean(sectionId) : picked.length > 0
  // A media-header notice *is* the file; without one there is nothing to send.
  const headerRule = mediaHeaderRule(template)
  const ready = Boolean(template?.meta_name) && allFilled(template, values) && audienceChosen && (!headerRule || Boolean(media))

  async function send() {
    setConfirming(false)
    if (!template) return
    try {
      const result = await broadcast.mutateAsync({
        audience:
          audienceType === 'school'
            ? { type: 'school', school_id: schoolId }
            : audienceType === 'section'
              ? { type: 'section', section_ids: [sectionId] }
              : { type: 'students', student_ids: picked },
        template_code: template.code,
        parameters: submittableValues(template, values),
        media,
      })
      setJobId(result.job_id)
      setValues({})
      setPicked([])
      setMedia(null)
      toast.show('Notice queued - sending in the background')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Send a notice"
        description="An approved WhatsApp message to parents - downtime, overdue work, new content, greetings."
        actions={
          <Button icon={<Megaphone className="h-4 w-4" />} loading={broadcast.isPending} disabled={!ready} onClick={() => setConfirming(true)}>
            Send notice
          </Button>
        }
      />

      <Tabs
        value={audienceType}
        onChange={(value) => setAudienceType(value as AudienceType)}
        tabs={[
          { value: 'school', label: 'Whole school' },
          { value: 'section', label: 'One class' },
          { value: 'students', label: 'Pick students' },
        ]}
      />

      <Card className="flex flex-col gap-4">
        {audienceType !== 'students' ? (
          <Select
            label="School"
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value)}
            placeholder="Pick a school"
            options={(schools.data ?? []).map((school) => ({ value: school.id, label: school.name }))}
          />
        ) : null}

        {audienceType === 'section' ? (
          <Select
            label="Class / section"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            placeholder={schoolId ? 'Pick a section' : 'Pick a school first'}
            options={(sections.data ?? []).map((section) => ({ value: section.id, label: `${section.class_id} - ${section.label}` }))}
          />
        ) : null}

        {audienceType === 'students' ? (
          <div className="flex flex-col gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search students or parents…" />
            <div className="max-h-64 overflow-y-auto rounded-lg border border-hairline">
              {searchable.map((contact) => (
                <label key={contact.student_id} className="flex items-center gap-3 border-b border-hairline px-3 py-2 last:border-b-0">
                  <Checkbox
                    checked={picked.includes(contact.student_id)}
                    onChange={(event) =>
                      setPicked((current) => (event.target.checked ? [...current, contact.student_id] : current.filter((id) => id !== contact.student_id)))
                    }
                  />
                  <span className="text-[13px]">
                    {contact.student_name}
                    <span className="text-muted"> · {contact.parent_name || 'Parent'}</span>
                  </span>
                </label>
              ))}
              {!searchable.length ? <p className="px-3 py-6 text-center text-[13px] text-muted">No contactable parents match.</p> : null}
            </div>
          </div>
        ) : null}

        <Select
          label="Notice"
          value={templateCode}
          onChange={(event) => {
            setTemplateCode(event.target.value)
            // Values belong to the template that asked for them; carrying them
            // over would submit one notice's text under another's parameter names.
            // The file goes too: an image chosen for the image notice would
            // otherwise silently become a follow-up on a text one.
            setValues({})
            setMedia(null)
          }}
          placeholder={noticeTemplates.isLoading ? 'Loading templates…' : 'Pick an approved notice'}
          options={(noticeTemplates.data ?? []).map((entry) => ({ value: entry.code, label: humanise(entry.code) }))}
          hint="Parents are messaged in their own language; the wording is the approved copy for that language."
        />

        {template ? (
          <>
            <UnapprovedTemplateWarning template={template} />
            <TemplateFields template={template} values={values} onChange={(name: string, value: string) => setValues((current) => ({ ...current, [name]: value }))} />
            <TemplatePreview template={template} values={values} />

            {media ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2 text-[13px]">
                <span className="truncate">{media.filename}</span>
                <Button variant="ghost" onClick={() => setMedia(null)}>
                  Remove
                </Button>
              </div>
            ) : (
              <FileDrop
                accept={headerRule ? headerRule.accept : '.pdf,.png,.jpg,.jpeg,.mp4,.3gp,.doc,.docx,.xls,.xlsx,.ppt,.pptx'}
                title={uploadMedia.isPending ? 'Uploading…' : headerRule ? headerRule.title : 'Attach a file (optional)'}
                hint={headerRule ? headerRule.hint : 'Image, video or document. Sent as a second message after the notice'}
                onFile={async (file) => {
                  // Checked here, before the upload, in WhatsApp's own terms -
                  // the server repeats the check, but a refusal the admin sees
                  // while the file is still in their hand is the useful one.
                  const problem = headerRule ? mediaHeaderProblem(headerRule, file) : null
                  if (problem) {
                    toast.show(problem, 'error')
                    return
                  }
                  try {
                    setMedia(await uploadMedia.mutateAsync(file))
                  } catch (err) {
                    toast.show(apiErrorMessage(err), 'error')
                  }
                }}
              />
            )}

            {media && !headerRule ? (
              <div className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[12px] text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  WhatsApp only delivers a file within 24 hours of a parent messaging us, which for most parents has not happened. The notice itself reaches everyone; the
                  attachment will show as skipped for the rest, with the reason on each row in the log.
                </span>
              </div>
            ) : null}
          </>
        ) : null}

        <p className="text-[12px] text-muted">
          Recipients: <span className="font-mono">{recipientCount}</span>
          {job.data && (job.data.status === 'running' || job.data.status === 'queued') ? (
            <span className="ml-3">
              Sending {job.data.progress.done} of {job.data.progress.total}…
            </span>
          ) : null}
        </p>
      </Card>

      {confirming ? (
        <ConfirmModal
          title="Send this notice?"
          description={`This messages ${recipientCount} parent(s) over WhatsApp and cannot be undone.`}
          confirmLabel="Send"
          onConfirm={send}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </div>
  )
}
