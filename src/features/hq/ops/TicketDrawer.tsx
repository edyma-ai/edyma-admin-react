import { useMemo, useState } from 'react'
import { Paperclip, StickyNote } from 'lucide-react'
import { fetchDownloadUrl, useAddTicketNote, useUpdateTicketStatus } from '@/api/queries/ops'
import { useSchools } from '@/api/queries/schools'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { SupportTicket, TicketStatus } from '@/types/support'
import { DetailItem } from '@/features/hq/shared/DetailItem'
import { RoleBadge } from '@/features/hq/shared/RoleBadge'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { TICKET_STATUS_LABELS, TICKET_TRANSITIONS, TicketCategoryBadge, TicketStatusBadge } from '@/features/hq/ops/ticketMeta'

export interface TicketDrawerProps {
  ticket: SupportTicket
  onClose: () => void
}

/** Full ticket detail: reporter, message, attachment, status actions and the internal notes thread. */
export function TicketDrawer({ ticket, onClose }: TicketDrawerProps) {
  const toast = useToast()
  const updateStatus = useUpdateTicketStatus(ticket.id)
  const addNote = useAddTicketNote(ticket.id)

  const [note, setNote] = useState('')
  const [attachmentLoading, setAttachmentLoading] = useState(false)

  // Resolve the reporter's school for display; note authors need no lookup —
  // the backend stores the display name in created_by (support_tickets.py).
  const schools = useSchools(undefined, Boolean(ticket.school_id))
  const schoolName = ticket.school_id ? schools.data?.find((school) => school.id === ticket.school_id)?.name : null

  const thread = useMemo(() => [...ticket.admin_notes].sort((a, b) => b.created_at - a.created_at), [ticket.admin_notes])

  async function moveTo(status: TicketStatus) {
    try {
      await updateStatus.mutateAsync(status)
      toast.show(`Ticket marked ${TICKET_STATUS_LABELS[status].toLowerCase()}`)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  async function submitNote() {
    const trimmed = note.trim()
    if (!trimmed) return
    try {
      await addNote.mutateAsync(trimmed)
      toast.show('Note added')
      setNote('')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  async function openAttachment() {
    if (!ticket.attachment_key) return
    setAttachmentLoading(true)
    try {
      const url = await fetchDownloadUrl(ticket.attachment_key)
      window.open(url, '_blank', 'noopener')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    } finally {
      setAttachmentLoading(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      size="md"
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          {ticket.user_name}
          <TicketStatusBadge status={ticket.status} />
        </span>
      }
      description={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <TicketCategoryBadge category={ticket.category} />
          opened <Timestamp at={ticket.created_at} />
        </span>
      }
    >
      <div className="flex flex-col gap-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <DetailItem label="Email">
            <span className="break-all font-mono text-xs">{ticket.user_email}</span>
          </DetailItem>
          <DetailItem label="Role">
            <RoleBadge role={ticket.user_role} />
          </DetailItem>
          <DetailItem label="School">{schoolName ?? (ticket.school_id ? <span className="font-mono text-xs">{ticket.school_id}</span> : '—')}</DetailItem>
          <DetailItem label="Last activity">
            <Timestamp at={ticket.updated_at} className="text-xs" />
          </DetailItem>
        </dl>

        <section className="rounded-card border border-hairline bg-canvas/60 p-4">
          <h3 className="text-[13px] font-bold text-ink">Message</h3>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{ticket.message}</p>
          {ticket.attachment_key ? (
            <Button variant="secondary" size="sm" className="mt-3" icon={<Paperclip className="h-3.5 w-3.5" />} loading={attachmentLoading} onClick={openAttachment}>
              View attachment
            </Button>
          ) : null}
        </section>

        <div className="flex items-center justify-between gap-3 rounded-control border border-hairline px-3 py-2.5">
          <p className="text-[13px] text-muted">
            Status: <span className="font-semibold text-ink">{TICKET_STATUS_LABELS[ticket.status]}</span>
          </p>
          <div className="flex items-center gap-2">
            {TICKET_TRANSITIONS[ticket.status].map((transition) => (
              <Button
                key={transition.to}
                size="sm"
                variant={transition.to === 'open' ? 'secondary' : 'primary'}
                loading={updateStatus.isPending && updateStatus.variables === transition.to}
                disabled={updateStatus.isPending}
                onClick={() => moveTo(transition.to)}
              >
                {transition.label}
              </Button>
            ))}
          </div>
        </div>

        <section>
          <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
            <StickyNote aria-hidden className="h-3.5 w-3.5 text-muted" />
            Internal notes
            <Badge tone="neutral" className="font-mono">
              {thread.length}
            </Badge>
          </h3>
          <div className="mt-3 flex flex-col gap-2">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Log a diagnosis, workaround or reply sent to the user…" />
            <Button size="sm" className="self-end" disabled={!note.trim()} loading={addNote.isPending} onClick={submitNote}>
              Add note
            </Button>
          </div>
          {thread.length > 0 ? (
            <ol className="mt-3 flex flex-col gap-3">
              {thread.map((entry, index) => (
                <li key={`${entry.created_at}-${index}`} className="rounded-control border border-hairline px-3 py-2.5">
                  <p className="whitespace-pre-wrap text-[13px] text-ink">{entry.note}</p>
                  <p className="mt-1.5 text-[11px] text-muted">
                    {entry.created_by || 'Operator'} · <Timestamp at={entry.created_at} className="text-[11px]" />
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-[13px] text-muted">No notes yet. Keep the paper trail here so anyone can pick the ticket up.</p>
          )}
        </section>
      </div>
    </Drawer>
  )
}
