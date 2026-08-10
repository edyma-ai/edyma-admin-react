import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, GraduationCap, StickyNote } from 'lucide-react'
import { useUpdateLead } from '@/api/queries/leads'
import { useAdminUsers } from '@/api/queries/users'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { Lead, LeadStatus } from '@/types/leads'
import { DetailItem } from '@/features/hq/shared/DetailItem'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { LeadStatusBadge } from '@/features/hq/leads/LeadStatusBadge'
import { LEAD_STATUS_LABELS, NEXT_LEAD_STATUS, leadDisplayName } from '@/features/hq/leads/leadFilters'
import { ActivateStudentModal } from '@/features/hq/retail/ActivateStudentModal'

const ADVANCE_COPY: Record<Exclude<LeadStatus, 'converted'>, { title: string; body: string }> = {
  new: { title: 'Mark as contacted?', body: 'Confirms someone from the team has reached out to this lead.' },
  contacted: { title: 'Mark as converted?', body: 'Confirms the lead signed up. Conversion actions unlock below.' },
}

export interface LeadDrawerProps {
  lead: Lead
  onClose: () => void
}

/** Full lead detail: fields, status advance, append-only notes timeline and the conversion actions. */
export function LeadDrawer({ lead, onClose }: LeadDrawerProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const updateLead = useUpdateLead(lead.id)

  const [confirmAdvance, setConfirmAdvance] = useState(false)
  const [note, setNote] = useState('')
  const [activateOpen, setActivateOpen] = useState(false)

  // Resolve note authors — leads operators (sa/sm) can always read /admin/users.
  const users = useAdminUsers({})
  const authorNames = useMemo(() => new Map((users.data ?? []).map((user) => [user.id, user.display_name])), [users.data])

  const nextStatus = NEXT_LEAD_STATUS[lead.status]
  const isSchool = lead.kind === 'school'
  const timeline = useMemo(() => [...lead.notes].sort((a, b) => b.created_at - a.created_at), [lead.notes])

  async function advanceStatus() {
    if (!nextStatus) return
    try {
      await updateLead.mutateAsync({ status: nextStatus })
      toast.show(`Lead marked ${LEAD_STATUS_LABELS[nextStatus].toLowerCase()}`)
      setConfirmAdvance(false)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  async function addNote() {
    const trimmed = note.trim()
    if (!trimmed) return
    try {
      await updateLead.mutateAsync({ note: trimmed })
      toast.show('Note added')
      setNote('')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  /** After a successful retail activation, close the loop on the lead itself. */
  async function onActivated() {
    if (lead.status === 'converted') return
    try {
      await updateLead.mutateAsync({ status: 'converted', note: 'Activated as an individual student from this lead.' })
      toast.show('Lead marked converted')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      size="md"
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          {leadDisplayName(lead)}
          <LeadStatusBadge status={lead.status} />
        </span>
      }
      description={
        <span className="inline-flex items-center gap-1.5">
          {isSchool ? <Building2 aria-hidden className="h-3.5 w-3.5" /> : <GraduationCap aria-hidden className="h-3.5 w-3.5" />}
          {isSchool ? 'School lead' : 'Student lead'} · arrived <Timestamp at={lead.created_at} />
        </span>
      }
    >
      <div className="flex flex-col gap-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <DetailItem label="Email">
            <span className="break-all font-mono text-xs">{lead.email}</span>
          </DetailItem>
          <DetailItem label="Phone">
            <span className="font-mono text-xs">{lead.phone}</span>
          </DetailItem>
          {isSchool ? (
            <>
              <DetailItem label="Contact person">{lead.contact_name || '—'}</DetailItem>
              <DetailItem label="School size">{lead.student_count_band ? <span className="font-mono text-xs">{lead.student_count_band} students</span> : '—'}</DetailItem>
            </>
          ) : (
            <>
              <DetailItem label="Guardian">{lead.guardian_name || '—'}</DetailItem>
              <DetailItem label="Grade">{lead.grade ? <span className="font-mono text-xs">{lead.grade}</span> : '—'}</DetailItem>
            </>
          )}
          <DetailItem label="City">{lead.city || '—'}</DetailItem>
          <DetailItem label="Board">{lead.board || '—'}</DetailItem>
        </dl>

        {nextStatus ? (
          <div className="flex items-center justify-between gap-3 rounded-control border border-hairline px-3 py-2.5">
            <p className="text-[13px] text-muted">
              Next step: <span className="font-semibold text-ink">{LEAD_STATUS_LABELS[nextStatus]}</span>
            </p>
            <Button size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => setConfirmAdvance(true)}>
              Mark {LEAD_STATUS_LABELS[nextStatus].toLowerCase()}
            </Button>
          </div>
        ) : null}

        <section className="rounded-card border border-hairline bg-canvas/60 p-4">
          <h3 className="text-[13px] font-bold text-ink">{isSchool ? 'Convert to a school' : 'Convert to an individual student'}</h3>
          {isSchool ? (
            <>
              <p className="mt-1 text-[13px] text-muted">
                {lead.status === 'converted'
                  ? 'Kick off onboarding. The wizard is prefilled from this lead.'
                  : 'Available once the lead is marked converted.'}
              </p>
              <Button
                className="mt-3"
                disabled={lead.status !== 'converted'}
                icon={<Building2 className="h-4 w-4" />}
                onClick={() => navigate('/schools/new', { state: { lead } })}
              >
                Start school onboarding
              </Button>
            </>
          ) : (
            <>
              <p className="mt-1 text-[13px] text-muted">Creates or picks the student account and activates the Individual plan. The lead is marked converted automatically.</p>
              <Button className="mt-3" icon={<GraduationCap className="h-4 w-4" />} onClick={() => setActivateOpen(true)}>
                Activate individual student
              </Button>
            </>
          )}
        </section>

        <section>
          <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
            <StickyNote aria-hidden className="h-3.5 w-3.5 text-muted" />
            Notes
            <Badge tone="neutral" className="font-mono">
              {timeline.length}
            </Badge>
          </h3>
          <div className="mt-3 flex flex-col gap-2">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Log a call, objection or follow-up…" />
            <Button size="sm" className="self-end" disabled={!note.trim()} loading={updateLead.isPending && !confirmAdvance} onClick={addNote}>
              Add note
            </Button>
          </div>
          {timeline.length > 0 ? (
            <ol className="mt-3 flex flex-col gap-3">
              {timeline.map((entry, index) => (
                <li key={`${entry.created_at}-${index}`} className="rounded-control border border-hairline px-3 py-2.5">
                  <p className="whitespace-pre-wrap text-[13px] text-ink">{entry.note}</p>
                  <p className="mt-1.5 text-[11px] text-muted">
                    {authorNames.get(entry.created_by) ?? 'Operator'} · <Timestamp at={entry.created_at} className="text-[11px]" />
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-[13px] text-muted">No notes yet. Every touchpoint you log lands here with author and time.</p>
          )}
        </section>
      </div>

      <Modal
        open={confirmAdvance}
        onClose={() => setConfirmAdvance(false)}
        size="sm"
        title={nextStatus ? ADVANCE_COPY[lead.status as Exclude<LeadStatus, 'converted'>].title : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmAdvance(false)}>
              Cancel
            </Button>
            <Button loading={updateLead.isPending} onClick={advanceStatus}>
              {nextStatus ? `Mark ${LEAD_STATUS_LABELS[nextStatus].toLowerCase()}` : ''}
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-muted">{nextStatus ? ADVANCE_COPY[lead.status as Exclude<LeadStatus, 'converted'>].body : ''}</p>
      </Modal>

      {activateOpen ? (
        <ActivateStudentModal
          prefill={{ email: lead.email, name: lead.name ?? undefined, grade: lead.grade ?? undefined }}
          onClose={() => setActivateOpen(false)}
          onActivated={onActivated}
        />
      ) : null}
    </Drawer>
  )
}
