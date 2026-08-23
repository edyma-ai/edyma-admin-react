import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PhoneCall } from 'lucide-react'
import { useLeads } from '@/api/queries/leads'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterChip, FilterChipRow } from '@/components/ui/FilterChip'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { apiErrorMessage } from '@/lib/apiError'
import type { Lead, LeadKind } from '@/types/leads'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { LeadDrawer } from '@/features/hq/leads/LeadDrawer'
import { LeadStatusBadge } from '@/features/hq/leads/LeadStatusBadge'
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  leadDisplayName,
  leadMatchesSearch,
  parseLeadKind,
  parseLeadSource,
  parseLeadStatus,
  type LeadKindFilter,
} from '@/features/hq/leads/leadFilters'

const KIND_LABELS: Record<LeadKind, string> = { student: 'Students', school: 'Schools' }

function leadColumns(kind: LeadKindFilter): Column<Lead>[] {
  const lead: Column<Lead> = {
    key: 'lead',
    header: kind === 'school' ? 'School' : 'Lead',
    render: (row) => (
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
          <span className="truncate">{leadDisplayName(row)}</span>
          {row.source === 'guest' ? <Badge tone="sky">Guest</Badge> : null}
        </p>
        <p className="truncate text-xs text-muted">{row.email ?? 'No email'}</p>
        {row.callback_requested_at ? (
          <p className="mt-1 flex items-center gap-1.5">
            <Badge tone="warning" icon={<PhoneCall aria-hidden className="h-3 w-3" />}>
              Callback requested
            </Badge>
            <Timestamp at={row.callback_requested_at} className="text-[11px] text-muted" />
          </p>
        ) : null}
      </div>
    ),
    sortValue: (row) => leadDisplayName(row),
  }

  const perKind: Column<Lead>[] =
    kind === 'student'
      ? [
          { key: 'guardian', header: 'Guardian', render: (row) => row.guardian_name || '—', sortValue: (row) => row.guardian_name ?? '' },
          { key: 'grade', header: 'Grade', mono: true, render: (row) => row.grade || '—', sortValue: (row) => row.grade ?? '' },
        ]
      : kind === 'school'
        ? [
            {
              key: 'contact',
              header: 'Contact',
              render: (row) => (
                <div className="min-w-0">
                  <p className="truncate">{row.contact_name || '—'}</p>
                  <p className="truncate font-mono text-xs text-muted">{row.phone}</p>
                </div>
              ),
              sortValue: (row) => row.contact_name ?? '',
            },
            { key: 'band', header: 'Students', mono: true, render: (row) => row.student_count_band || '—', sortValue: (row) => row.student_count_band ?? '' },
          ]
        : [
            {
              key: 'kind',
              header: 'Kind',
              render: (row) => <Badge tone={row.kind === 'school' ? 'sky' : 'neutral'}>{row.kind === 'school' ? 'School' : 'Student'}</Badge>,
              sortValue: (row) => row.kind,
            },
          ]

  return [
    lead,
    ...perKind,
    { key: 'city', header: 'City', render: (row) => row.city || '—', sortValue: (row) => row.city ?? '' },
    { key: 'board', header: 'Board', render: (row) => row.board || '—', sortValue: (row) => row.board ?? '' },
    { key: 'status', header: 'Status', render: (row) => <LeadStatusBadge status={row.status} />, sortValue: (row) => row.status },
    { key: 'created', header: 'Created', align: 'right', render: (row) => <Timestamp at={row.created_at} />, sortValue: (row) => row.created_at },
  ]
}

/** The leads pipeline: status + kind chips with live counts, client-side search, and a working drawer per row. */
export function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseLeadStatus(searchParams.get('status'))
  const kind = parseLeadKind(searchParams.get('kind'))
  const source = parseLeadSource(searchParams.get('source'))
  const search = searchParams.get('search') ?? ''

  // Source is the one server-side facet: the backend indexes it, and guests are a
  // different pipeline rather than a slice of the same one.
  const leads = useLeads(undefined, { source: source || undefined })
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
    if (!needle) return leads.data ?? []
    return (leads.data ?? []).filter((lead) => leadMatchesSearch(lead, needle))
  }, [leads.data, search])

  // Each chip group counts within the OTHER group's filter, so counts always reflect what a click yields.
  const kindFiltered = useMemo(() => (kind ? searched.filter((lead) => lead.kind === kind) : searched), [searched, kind])
  const statusFiltered = useMemo(() => (status ? searched.filter((lead) => lead.status === status) : searched), [searched, status])
  const visible = useMemo(() => (status ? kindFiltered.filter((lead) => lead.status === status) : kindFiltered), [kindFiltered, status])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { new: 0, contacted: 0, converted: 0 }
    for (const lead of kindFiltered) counts[lead.status] = (counts[lead.status] ?? 0) + 1
    return counts
  }, [kindFiltered])

  const kindCounts = useMemo(() => {
    const counts: Record<LeadKind, number> = { student: 0, school: 0 }
    for (const lead of statusFiltered) counts[lead.kind] += 1
    return counts
  }, [statusFiltered])

  const columns = useMemo(() => leadColumns(kind), [kind])
  const selected = useMemo(() => leads.data?.find((lead) => lead.id === selectedId) ?? null, [leads.data, selectedId])
  const hasFilters = Boolean(status || kind || source || search)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Leads" description="Everyone who raised a hand on the website or started exploring the app as a guest. Work them from new to converted." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(value) => patchParams({ search: value })} placeholder="Search name, school, phone, city…" className="w-72" />
        <div className="flex-1" />
        <FilterChipRow>
          <FilterChip active={!kind} onClick={() => patchParams({ kind: '' })}>
            All kinds
          </FilterChip>
          {(Object.keys(KIND_LABELS) as LeadKind[]).map((value) => (
            <FilterChip key={value} active={kind === value} count={kindCounts[value]} onClick={() => patchParams({ kind: kind === value ? '' : value })}>
              {KIND_LABELS[value]}
            </FilterChip>
          ))}
        </FilterChipRow>
      </div>

      <FilterChipRow>
        <FilterChip active={!status} count={kindFiltered.length} onClick={() => patchParams({ status: '' })}>
          All statuses
        </FilterChip>
        {LEAD_STATUSES.map((value) => (
          <FilterChip key={value} active={status === value} count={statusCounts[value]} onClick={() => patchParams({ status: status === value ? '' : value })}>
            {LEAD_STATUS_LABELS[value]}
          </FilterChip>
        ))}
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        <FilterChip active={!source} onClick={() => patchParams({ source: '' })}>
          All sources
        </FilterChip>
        {LEAD_SOURCES.map((value) => (
          <FilterChip key={value} active={source === value} onClick={() => patchParams({ source: source === value ? '' : value })}>
            {LEAD_SOURCE_LABELS[value]}
          </FilterChip>
        ))}
      </FilterChipRow>

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(row) => row.id}
        loading={leads.isPending}
        error={leads.isError ? apiErrorMessage(leads.error) : null}
        onRetry={() => void leads.refetch()}
        onRowClick={(row) => setSelectedId(row.id)}
        pageSize={15}
        refreshing={leads.isPlaceholderData}
        pageResetKey={[search, kind, status, source].join('|')}
        initialSort={{ key: 'created', direction: 'desc' }}
        emptyState={
          hasFilters ? (
            <EmptyState
              title="No leads match"
              description="Try a different search or clear the filters."
              action={
                <Button variant="secondary" size="sm" onClick={() => patchParams({ status: '', kind: '', source: '', search: '' })}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState title="No leads yet" description="Leads arrive here the moment someone submits the register-interest form on the website." />
          )
        }
      />

      {selected ? <LeadDrawer lead={selected} onClose={() => setSelectedId(null)} /> : null}
    </div>
  )
}
