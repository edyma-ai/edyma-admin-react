import { useState } from 'react'
import { RotateCcw, ScrollText } from 'lucide-react'
import { useParentMessages, useRetryMessage } from '@/api/queries/parentComms'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterChip } from '@/components/ui/FilterChip'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/Card'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { MessageStatus, ParentMessage } from '@/types/parentComms'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { KindBadge, StatusBadge } from '@/features/hq/parents/shared'

const STATUS_FILTERS: { value: MessageStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'read', label: 'Read' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Skipped' },
]

/**
 * Every parent-bound message, whatever produced it - reports, notices,
 * replies, automated alerts and inbound messages all route through one
 * outbox, so this log is the complete record rather than a partial one.
 */
export function ParentLogPage() {
  const toast = useToast()
  const [status, setStatus] = useState<MessageStatus | ''>('')
  const messages = useParentMessages(status ? { status } : {})
  const retry = useRetryMessage()

  async function retryOne(messageId: string) {
    try {
      await retry.mutateAsync(messageId)
      toast.show('Re-queued - it will be retried in the background')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  const columns: Column<ParentMessage>[] = [
    { key: 'when', header: 'When', render: (row) => <Timestamp at={row.created_at} /> },
    { key: 'kind', header: 'Type', render: (row) => <KindBadge kind={row.kind} /> },
    {
      key: 'to',
      header: 'Parent',
      render: (row) => <span className="font-mono text-[12px]">{row.parent_whatsapp ?? '-'}</span>,
    },
    {
      key: 'body',
      header: 'Message',
      render: (row) => <span className="line-clamp-2 max-w-[380px] text-[13px]">{row.body_text || '-'}</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'reason',
      header: 'Detail',
      render: (row) => (row.error_message ? <span className="text-[12px] text-muted">{row.error_message}</span> : '-'),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        row.status === 'failed' || row.status === 'skipped' ? (
          <Button variant="secondary" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => retryOne(row.id)}>
            Retry
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Message log" description="Every message to and from parents, with its delivery status as WhatsApp reports it." />

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => (
          <FilterChip key={filter.value || 'all'} active={status === filter.value} onClick={() => setStatus(filter.value)}>
            {filter.label}
          </FilterChip>
        ))}
      </div>

      <SectionCard title="Messages" description="Newest first. Failed and skipped rows can be re-queued.">
        <DataTable
          columns={columns}
          rows={messages.data ?? []}
          rowKey={(row) => row.id}
          loading={messages.isPending}
          error={messages.isError ? apiErrorMessage(messages.error) : null}
          pageSize={25}
          emptyState={<EmptyState icon={ScrollText} title="Nothing sent yet" description="Messages appear here as soon as anything is queued." />}
        />
      </SectionCard>
    </div>
  )
}
