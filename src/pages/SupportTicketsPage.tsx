import { useEffect, useState } from 'react'
import { RefreshCw, Search, Filter, Clock, MessageCircle, Send, Paperclip, ExternalLink } from 'react-feather'
import { api } from '@/api/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import type { SupportTicket, TicketStatus, TicketCategory } from '@/types/models'

const STATUS_ORDER: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed']

const STATUS_META: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'text-accent-orange', bg: 'bg-amber-50 border-amber-200' },
  in_progress: { label: 'In Progress', color: 'text-accent-blue', bg: 'bg-sky-50 border-sky-200' },
  resolved: { label: 'Resolved', color: 'text-accent-green', bg: 'bg-emerald-50 border-emerald-200' },
  closed: { label: 'Closed', color: 'text-muted', bg: 'bg-slate-50 border-slate-200' },
}

const CATEGORY_META: Record<TicketCategory, { label: string; variant: 'danger' | 'accent' | 'warning' | 'neutral' }> = {
  bug: { label: 'Bug', variant: 'danger' },
  feature_request: { label: 'Feature', variant: 'accent' },
  feedback: { label: 'Feedback', variant: 'warning' },
  general: { label: 'General', variant: 'neutral' },
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function SupportTicketsPage() {
  const { show } = useToast()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SupportTicket | null>(null)

  function fetchTickets() {
    setLoading(true)
    setError('')
    const params: Record<string, string> = {}
    if (categoryFilter) params.category = categoryFilter
    if (search.trim()) params.search = search.trim()
    api
      .get<SupportTicket[]>('/api/v1/admin/support-tickets', { params })
      .then(({ data }) => {
        setTickets(data)
        setLoading(false)
      })
      .catch((e) => {
        setError(apiErrorMessage(e))
        setLoading(false)
      })
  }

  useEffect(() => { fetchTickets() }, [categoryFilter])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchTickets()
  }

  async function updateStatus(ticketId: string, status: TicketStatus) {
    try {
      const { data } = await api.patch<SupportTicket>(
        `/api/v1/admin/support-tickets/${ticketId}/status`,
        { status },
      )
      setTickets((prev) => prev.map((t) => (t.id === data.id ? data : t)))
      setSelected((prev) => (prev?.id === data.id ? data : prev))
      show('Status updated', 'success')
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  async function addNote(ticketId: string, note: string) {
    try {
      const { data } = await api.post<SupportTicket>(
        `/api/v1/admin/support-tickets/${ticketId}/notes`,
        { note },
      )
      setTickets((prev) => prev.map((t) => (t.id === data.id ? data : t)))
      setSelected((prev) => (prev?.id === data.id ? data : prev))
      show('Note added', 'success')
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  const grouped = STATUS_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: tickets.filter((t) => t.status === s) }),
    {} as Record<TicketStatus, SupportTicket[]>,
  )

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        description={`${tickets.length} ticket${tickets.length === 1 ? '' : 's'} total`}
        actions={
          <Button variant="ghost" size="sm" onClick={fetchTickets} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
            />
          </div>
          <Button variant="outline" size="sm" type="submit">
            Search
          </Button>
        </form>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted" />
          <Select
            options={[
              { value: '', label: 'All categories' },
              { value: 'bug', label: 'Bug Reports' },
              { value: 'feature_request', label: 'Feature Requests' },
              { value: 'feedback', label: 'Feedback' },
              { value: 'general', label: 'General' },
            ]}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-44!"
          />
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      ) : null}

      {/* Kanban columns */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="text-muted" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {STATUS_ORDER.map((status) => (
            <StatusColumn
              key={status}
              status={status}
              tickets={grouped[status]}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected ? (
        <TicketDetailModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
          onAddNote={addNote}
        />
      ) : null}
    </div>
  )
}

/* ─── Kanban Column ─────────────────────────────────────────────────────────── */

function StatusColumn({
  status,
  tickets,
  onSelect,
}: {
  status: TicketStatus
  tickets: SupportTicket[]
  onSelect: (t: SupportTicket) => void
}) {
  const meta = STATUS_META[status]
  return (
    <div className="flex flex-col rounded-xl border border-border-light bg-slate-50/60">
      <div className={cn('flex items-center justify-between rounded-t-xl border-b px-4 py-3', meta.bg)}>
        <span className={cn('text-sm font-semibold', meta.color)}>{meta.label}</span>
        <span className={cn(
          'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
          meta.color,
          meta.bg,
        )}>
          {tickets.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2" style={{ minHeight: 120 }}>
        {tickets.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted">No tickets</p>
        ) : (
          tickets.map((t) => <TicketCard key={t.id} ticket={t} onClick={() => onSelect(t)} />)
        )}
      </div>
    </div>
  )
}

/* ─── Ticket Card ───────────────────────────────────────────────────────────── */

function TicketCard({ ticket, onClick }: { ticket: SupportTicket; onClick: () => void }) {
  const catMeta = CATEGORY_META[ticket.category]
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-border-light bg-white p-3 text-left shadow-sm transition-all hover:shadow-md hover:border-brand-sky/40"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-brand-slate">{ticket.user_name}</span>
        <Badge variant={catMeta.variant} className="shrink-0">{catMeta.label}</Badge>
      </div>
      <p className="mb-2 line-clamp-2 text-xs text-muted">{ticket.message}</p>
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="truncate">{ticket.user_email}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Clock size={12} />
          {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        {ticket.attachment_key && (
          <span className="flex items-center gap-1 text-xs text-muted">
            <Paperclip size={12} />
            File
          </span>
        )}
        {ticket.admin_notes.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-accent-blue">
            <MessageCircle size={12} />
            {ticket.admin_notes.length} note{ticket.admin_notes.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  )
}

/* ─── Detail Modal ──────────────────────────────────────────────────────────── */

function TicketDetailModal({
  ticket,
  onClose,
  onStatusChange,
  onAddNote,
}: {
  ticket: SupportTicket
  onClose: () => void
  onStatusChange: (id: string, status: TicketStatus) => Promise<void>
  onAddNote: (id: string, note: string) => Promise<void>
}) {
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const catMeta = CATEGORY_META[ticket.category]

  async function handleAddNote() {
    if (!noteText.trim()) return
    setSaving(true)
    await onAddNote(ticket.id, noteText.trim())
    setNoteText('')
    setSaving(false)
  }

  return (
    <Modal open title="Ticket Details" onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* User info + category */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-sky-light text-sm font-bold text-accent-blue">
            {ticket.user_name.charAt(0).toUpperCase()}
          </div>
          <div className="mr-auto">
            <p className="text-sm font-semibold text-brand-slate">{ticket.user_name}</p>
            <p className="text-xs text-muted">{ticket.user_email}</p>
          </div>
          <Badge variant="neutral" className="capitalize">{ticket.user_role.replace('_', ' ')}</Badge>
          <Badge variant={catMeta.variant}>{catMeta.label}</Badge>
        </div>

        {/* Message */}
        <div className="rounded-lg border border-border-light bg-slate-50/80 p-4">
          <p className="whitespace-pre-wrap text-sm text-brand-slate">{ticket.message}</p>
          <p className="mt-2 text-xs text-muted">{formatDate(ticket.created_at)}</p>
        </div>

        {/* Attachment */}
        {ticket.attachment_key && (
          <AttachmentLink fileKey={ticket.attachment_key} />
        )}

        {/* Status */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-brand-slate">Status</label>
          <Select
            options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label }))}
            value={ticket.status}
            onChange={(e) => onStatusChange(ticket.id, e.target.value as TicketStatus)}
            className="w-44!"
          />
        </div>

        {/* Admin notes */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-brand-slate">
            Internal Notes ({ticket.admin_notes.length})
          </h3>
          {ticket.admin_notes.length === 0 ? (
            <p className="text-xs text-muted">No notes yet.</p>
          ) : (
            <div className="space-y-2">
              {ticket.admin_notes.map((n, i) => (
                <div key={i} className="rounded-lg border border-border-light bg-white p-3">
                  <p className="text-sm text-brand-slate">{n.note}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                    <span className="font-medium">{n.created_by}</span>
                    <span>·</span>
                    <span>{formatDate(n.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-start gap-2">
            <Textarea
              placeholder="Add an internal note…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="min-h-[60px]!"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddNote}
              disabled={saving || !noteText.trim()}
              className="mt-1 shrink-0"
            >
              <Send size={14} />
              {saving ? 'Saving…' : 'Add'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Attachment Link ───────────────────────────────────────────────────────── */

function AttachmentLink({ fileKey }: { fileKey: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isPdf = fileKey.toLowerCase().endsWith('.pdf')

  async function fetchUrl() {
    if (url) {
      window.open(url, '_blank')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.get<{ download_url: string }>(
        '/api/v1/files/download-url',
        { params: { key: fileKey } },
      )
      setUrl(data.download_url)
      window.open(data.download_url, '_blank')
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-light bg-white px-3 py-2">
      <Paperclip size={16} className="shrink-0 text-muted" />
      <span className="truncate text-sm text-brand-slate">{isPdf ? 'PDF' : 'Image'} attachment</span>
      <button
        type="button"
        onClick={fetchUrl}
        disabled={loading}
        className="ml-auto flex shrink-0 items-center gap-1 text-xs font-medium text-accent-blue hover:underline disabled:opacity-50"
      >
        <ExternalLink size={12} />
        {loading ? 'Loading…' : 'View'}
      </button>
    </div>
  )
}
