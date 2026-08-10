/* eslint-disable react-refresh/only-export-components -- tiny badges + inbox metadata shared by the support screens */
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import type { SupportTicket, TicketCategory, TicketStatus } from '@/types/support'

export const TICKET_STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed']

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

const STATUS_TONES: Record<TicketStatus, BadgeTone> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'neutral',
}

export const TICKET_CATEGORIES: TicketCategory[] = ['bug', 'feature_request', 'feedback', 'general']

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: 'Bug',
  feature_request: 'Feature request',
  feedback: 'Feedback',
  general: 'General',
}

const CATEGORY_TONES: Record<TicketCategory, BadgeTone> = {
  bug: 'danger',
  feature_request: 'info',
  feedback: 'sky',
  general: 'neutral',
}

/** Where a ticket can move next — drives the action buttons in the drawer. */
export const TICKET_TRANSITIONS: Record<TicketStatus, { to: TicketStatus; label: string }[]> = {
  open: [
    { to: 'in_progress', label: 'Start progress' },
    { to: 'resolved', label: 'Resolve' },
  ],
  in_progress: [
    { to: 'resolved', label: 'Resolve' },
    { to: 'open', label: 'Back to open' },
  ],
  resolved: [
    { to: 'closed', label: 'Close' },
    { to: 'open', label: 'Reopen' },
  ],
  closed: [{ to: 'open', label: 'Reopen' }],
}

const STATUS_RANK: Record<TicketStatus, number> = { open: 0, in_progress: 1, resolved: 2, closed: 3 }

/** Inbox order: actionable first (open → in progress → resolved → closed), newest within each band. */
export function ticketInboxOrder(a: SupportTicket, b: SupportTicket): number {
  return STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.created_at - a.created_at
}

export function parseTicketStatus(raw: string | null): TicketStatus | null {
  return TICKET_STATUSES.includes(raw as TicketStatus) ? (raw as TicketStatus) : null
}

export function parseTicketCategory(raw: string | null): TicketCategory | null {
  return TICKET_CATEGORIES.includes(raw as TicketCategory) ? (raw as TicketCategory) : null
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{TICKET_STATUS_LABELS[status]}</Badge>
}

export function TicketCategoryBadge({ category }: { category: TicketCategory }) {
  return <Badge tone={CATEGORY_TONES[category]}>{TICKET_CATEGORY_LABELS[category]}</Badge>
}
