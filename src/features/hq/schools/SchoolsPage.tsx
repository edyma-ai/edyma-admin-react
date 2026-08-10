import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useSchools } from '@/api/queries/schools'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { apiErrorMessage } from '@/lib/apiError'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import type { School } from '@/types/schools'
import { PlanBadge } from '@/features/hq/shared/PlanBadge'
import { Timestamp } from '@/features/hq/shared/Timestamp'

const COLUMNS: Column<School>[] = [
  {
    key: 'name',
    header: 'School',
    render: (row) => <span className="font-semibold">{row.name}</span>,
    sortValue: (row) => row.name,
  },
  { key: 'city', header: 'City', render: (row) => row.city || '—', sortValue: (row) => row.city ?? '' },
  { key: 'plan', header: 'Plan', render: (row) => <PlanBadge planType={row.plan_type} />, sortValue: (row) => row.plan_type ?? '' },
  {
    key: 'created',
    header: 'Created',
    align: 'right',
    render: (row) => <Timestamp at={row.created_at} />,
    sortValue: (row) => row.created_at,
  },
]

export function SchoolsPage() {
  const { user: me } = useAuth()
  const canOnboard = me?.role === 'super_admin'
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const debouncedSearch = useDebouncedValue(search, 300)
  const schools = useSchools(debouncedSearch.trim() || undefined)

  function setSearch(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set('search', value)
        else next.delete('search')
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Schools"
        description="Every school on the platform with its plan at a glance."
        actions={
          // Only super_admin may create a school: `admin.schools.create` is
          // granted to no role, so everyone else relies on the super_admin
          // RBAC bypass and would 403 on the wizard's first write.
          canOnboard ? (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/schools/new')}>
              New school
            </Button>
          ) : null
        }
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Search schools by name…" className="max-w-xs" />
      <DataTable
        columns={COLUMNS}
        rows={schools.data ?? []}
        rowKey={(row) => row.id}
        loading={schools.isPending}
        refreshing={schools.isPlaceholderData}
        error={schools.isError ? apiErrorMessage(schools.error) : null}
        onRetry={() => void schools.refetch()}
        onRowClick={(row) => navigate(`/schools/${row.id}`)}
        pageSize={15}
        initialSort={{ key: 'name', direction: 'asc' }}
        emptyState={
          search ? (
            <EmptyState
              title="No schools match"
              description={`Nothing named like “${search}”.`}
              action={
                <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState title="No schools yet" description="Schools appear here once they are onboarded." />
          )
        }
      />
    </div>
  )
}
