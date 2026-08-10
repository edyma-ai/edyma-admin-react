import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LifeBuoy } from 'lucide-react'
import { useSupportTickets } from '@/api/queries/ops'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterChip, FilterChipRow } from '@/components/ui/FilterChip'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { apiErrorMessage } from '@/lib/apiError'
import type { SupportTicket, TicketCategory, TicketStatus } from '@/types/support'
import { RoleBadge } from '@/features/hq/shared/RoleBadge'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { TicketDrawer } from '@/features/hq/ops/TicketDrawer'
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TicketCategoryBadge,
  TicketStatusBadge,
  parseTicketCategory,
  parseTicketStatus,
  ticketInboxOrder,
} from '@/features/hq/ops/ticketMeta'

const COLUMNS: Column<SupportTicket>[] = [
  {
    key: 'reporter',
    header: 'Reporter',
    render: (row) => (
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{row.user_name}</p>
        <p className="truncate font-mono text-xs text-muted">{row.user_email}</p>
      </div>
    ),
    sortValue: (row) => row.user_name,
  },
  { key: 'role', header: 'Role', render: (row) => <RoleBadge role={row.user_role} />, sortValue: (row) => row.user_role },
  { key: 'category', header: 'Category', render: (row) => <TicketCategoryBadge category={row.category} />, sortValue: (row) => row.category },
  {
    key: 'message',
    header: 'Message',
    render: (row) => <p className="max-w-sm truncate text-muted">{row.message}</p>,
  },
  {
    key: 'notes',
    header: 'Notes',
    align: 'center',
    mono: true,
    render: (row) => (row.admin_notes.length > 0 ? row.admin_notes.length : <span className="text-muted">—</span>),
    sortValue: (row) => row.admin_notes.length,
  },
  { key: 'status', header: 'Status', render: (row) => <TicketStatusBadge status={row.status} />, sortValue: (row) => row.status },
  { key: 'raised', header: 'Raised', align: 'right', render: (row) => <Timestamp at={row.created_at} />, sortValue: (row) => row.created_at },
]

function matchesSearch(ticket: SupportTicket, needle: string): boolean {
  return [ticket.user_name, ticket.user_email, ticket.message].some((text) => text.toLowerCase().includes(needle))
}

/** The support inbox: every ticket raised in the app, actionable ones first, worked from a detail drawer. */
export function SupportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseTicketStatus(searchParams.get('status'))
  const category = parseTicketCategory(searchParams.get('category'))
  const search = searchParams.get('search') ?? ''

  const tickets = useSupportTickets()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function patchParams(patch: Record<string, string>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )
  }

  const searched = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return tickets.data ?? []
    return (tickets.data ?? []).filter((ticket) => matchesSearch(ticket, needle))
  }, [tickets.data, search])

  // Each chip group counts within the OTHER group's filter, so counts always reflect what a click yields.
  const categoryFiltered = useMemo(() => (category ? searched.filter((t) => t.category === category) : searched), [searched, category])
  const statusFiltered = useMemo(() => (status ? searched.filter((t) => t.status === status) : searched), [searched, status])
  const visible = useMemo(
    () => (status ? categoryFiltered.filter((t) => t.status === status) : categoryFiltered).slice().sort(ticketInboxOrder),
    [categoryFiltered, status],
  )

  const statusCounts = useMemo(() => {
    const counts: Record<TicketStatus, number> = { open: 0, in_progress: 0, resolved: 0, closed: 0 }
    for (const ticket of categoryFiltered) counts[ticket.status] += 1
    return counts
  }, [categoryFiltered])

  const categoryCounts = useMemo(() => {
    const counts: Record<TicketCategory, number> = { bug: 0, feature_request: 0, feedback: 0, general: 0 }
    for (const ticket of statusFiltered) counts[ticket.category] += 1
    return counts
  }, [statusFiltered])

  const openCount = useMemo(() => (tickets.data ?? []).filter((t) => t.status === 'open' || t.status === 'in_progress').length, [tickets.data])
  const selected = useMemo(() => tickets.data?.find((ticket) => ticket.id === selectedId) ?? null, [tickets.data, selectedId])
  const hasFilters = Boolean(status || category || search)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2.5">
            Support inbox
            {openCount > 0 ? <Badge tone="warning">{openCount} needing attention</Badge> : null}
          </span>
        }
        description="Tickets raised from the mobile app and console. Actionable ones surface first."
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(value) => patchParams({ search: value })} placeholder="Search reporter, email, message…" className="w-72" />
        <div className="flex-1" />
        <FilterChipRow>
          <FilterChip active={!category} onClick={() => patchParams({ category: '' })}>
            All categories
          </FilterChip>
          {TICKET_CATEGORIES.map((value) => (
            <FilterChip key={value} active={category === value} count={categoryCounts[value]} onClick={() => patchParams({ category: category === value ? '' : value })}>
              {TICKET_CATEGORY_LABELS[value]}
            </FilterChip>
          ))}
        </FilterChipRow>
      </div>

      <FilterChipRow>
        <FilterChip active={!status} count={categoryFiltered.length} onClick={() => patchParams({ status: '' })}>
          All statuses
        </FilterChip>
        {TICKET_STATUSES.map((value) => (
          <FilterChip key={value} active={status === value} count={statusCounts[value]} onClick={() => patchParams({ status: status === value ? '' : value })}>
            {TICKET_STATUS_LABELS[value]}
          </FilterChip>
        ))}
      </FilterChipRow>

      <DataTable
        columns={COLUMNS}
        rows={visible}
        rowKey={(row) => row.id}
        loading={tickets.isPending}
        error={tickets.isError ? apiErrorMessage(tickets.error) : null}
        onRetry={() => void tickets.refetch()}
        onRowClick={(row) => setSelectedId(row.id)}
        pageSize={15}
        emptyState={
          hasFilters ? (
            <EmptyState
              title="No tickets match"
              description="Try a different search or clear the filters."
              action={
                <Button variant="secondary" size="sm" onClick={() => patchParams({ status: '', category: '', search: '' })}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={LifeBuoy} title="Inbox zero" description="Tickets land here the moment a teacher or student reports something in the app." />
          )
        }
      />

      {selected ? <TicketDrawer ticket={selected} onClose={() => setSelectedId(null)} /> : null}
    </div>
  )
}
