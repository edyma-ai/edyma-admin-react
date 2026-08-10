import { Badge } from '@/components/ui/Badge'
import type { MessageKind, MessageStatus, ParentLanguage } from '@/types/parentComms'
import { LANGUAGE_LABEL } from '@/features/hq/parents/format'

/** Delivery states, coloured by what an operator should do about them. */
const STATUS_TONE: Record<MessageStatus, 'neutral' | 'sky' | 'info' | 'success' | 'danger' | 'warning'> = {
  queued: 'neutral',
  sending: 'neutral',
  sent: 'sky',
  delivered: 'info',
  read: 'success',
  failed: 'danger',
  // Skipped is deliberate, not broken - amber, never red.
  skipped: 'warning',
}

const STATUS_LABEL: Record<MessageStatus, string> = {
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
  skipped: 'Skipped',
}

export function StatusBadge({ status }: { status: MessageStatus }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{STATUS_LABEL[status] ?? status}</Badge>
}

const KIND_LABEL: Record<MessageKind, string> = {
  intro: 'Introduction',
  weekly_report: 'Weekly report',
  monthly_report: 'Monthly report',
  broadcast: 'Notice',
  reply: 'Reply',
  inbound: 'From parent',
}

export function KindBadge({ kind }: { kind: MessageKind }) {
  return <Badge tone={kind === 'inbound' ? 'ai' : 'neutral'}>{KIND_LABEL[kind] ?? kind}</Badge>
}

export function LanguageBadge({ language }: { language: ParentLanguage }) {
  return <Badge tone="neutral">{LANGUAGE_LABEL[language] ?? language}</Badge>
}
