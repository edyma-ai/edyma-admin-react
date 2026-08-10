import { useMemo, useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useSchools } from '@/api/queries/schools'
import { useAdminUsers } from '@/api/queries/users'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterChip, FilterChipRow } from '@/components/ui/FilterChip'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { apiErrorMessage } from '@/lib/apiError'
import { formatNumber } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/roles'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import type { UserRole } from '@/types/common'
import type { AdminUser } from '@/types/users'
import { RoleBadge } from '@/features/hq/shared/RoleBadge'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { CreateUserModal } from '@/features/hq/users/CreateUserModal'
import { UserDrawer } from '@/features/hq/users/UserDrawer'
import type { UserListFilters } from '@/features/hq/users/userFilters'

const SCHOOL_ROLES: UserRole[] = ['student', 'teacher', 'school_manager']
const PLATFORM_ROLES: UserRole[] = ['super_admin', 'super_sales_manager', 'super_content_manager']

export interface UsersTableProps {
  filters: UserListFilters
  onFiltersChange: (filters: UserListFilters) => void
  /** Pins the table to one school (school-detail tab, School OS) — hides the school filter and column. */
  lockedSchoolId?: string
  /** Pins the table to one role (School OS people pages) — hides the role chips and column. */
  lockedRole?: UserRole
  /** Overrides the default super_admin-only management affordances (School OS managers manage their own school). */
  canManage?: boolean
  /** Roles offered in the create modal — defaults to everything the context allows. */
  createRoles?: UserRole[]
  /** Replaces the default UserDrawer with a context-specific detail pane. */
  renderDrawer?: (user: AdminUser, onClose: () => void) => ReactNode
  /** The usage-columns switch needs the credit-stats grant — School OS hides it. */
  showUsageToggle?: boolean
  /** Extra toolbar buttons rendered beside the create button (e.g. CSV import). */
  extraActions?: ReactNode
}

/** The /admin/users workspace: filter bar, table, create modal and detail drawer. Reused by the school-detail Users tab and the School OS people pages. */
export function UsersTable({
  filters,
  onFiltersChange,
  lockedSchoolId,
  lockedRole,
  canManage,
  createRoles,
  renderDrawer,
  showUsageToggle = true,
  extraActions,
}: UsersTableProps) {
  const { user: me } = useAuth()
  const manage = canManage ?? me?.role === 'super_admin'

  const debouncedSearch = useDebouncedValue(filters.search, 300)
  const users = useAdminUsers({
    search: debouncedSearch.trim() || undefined,
    role: lockedRole ?? (filters.role || undefined),
    account_status: filters.status || undefined,
    school_id: lockedSchoolId ?? (filters.schoolId || undefined),
    include_usage: filters.includeUsage || undefined,
  })
  // Managers can't read /admin/schools; every school-dependent affordance is hidden for them anyway.
  const schools = useSchools(undefined, me?.role !== 'school_manager')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const schoolNames = useMemo(() => new Map((schools.data ?? []).map((school) => [school.id, school.name])), [schools.data])
  const selectedUser = useMemo(() => users.data?.find((entry) => entry.id === selectedId) ?? null, [users.data, selectedId])
  const roleChips = lockedSchoolId ? SCHOOL_ROLES : [...SCHOOL_ROLES, ...PLATFORM_ROLES]

  function patchFilters(patch: Partial<UserListFilters>) {
    onFiltersChange({ ...filters, ...patch })
  }

  const columns = useMemo<Column<AdminUser>[]>(() => {
    const cols: Column<AdminUser>[] = [
      {
        key: 'user',
        header: 'User',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.display_name}</p>
            <p className="truncate text-xs text-muted">{row.email}</p>
          </div>
        ),
        sortValue: (row) => row.display_name,
      },
    ]
    if (!lockedRole) {
      cols.push({ key: 'role', header: 'Role', render: (row) => <RoleBadge role={row.role} />, sortValue: (row) => row.role })
    }
    if (!lockedSchoolId) {
      cols.push({
        key: 'school',
        header: 'School',
        render: (row) => (row.school_id ? (schoolNames.get(row.school_id) ?? row.school_id) : '—'),
        sortValue: (row) => (row.school_id ? (schoolNames.get(row.school_id) ?? '') : ''),
      })
    }
    cols.push({
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={row.account_status === 'active' ? 'success' : 'neutral'}>{row.account_status === 'active' ? 'Active' : 'Inactive'}</Badge>,
      sortValue: (row) => row.account_status,
    })
    if (filters.includeUsage) {
      cols.push(
        {
          key: 'credits',
          header: 'Credits',
          mono: true,
          align: 'right',
          render: (row) => formatNumber(Math.round(row.total_credits ?? 0)),
          sortValue: (row) => row.total_credits ?? 0,
        },
        {
          key: 'requests',
          header: 'Requests',
          mono: true,
          align: 'right',
          render: (row) => formatNumber(row.total_requests ?? 0),
          sortValue: (row) => row.total_requests ?? 0,
        },
      )
    }
    cols.push({
      key: 'last_login',
      header: 'Last login',
      align: 'right',
      render: (row) => <Timestamp at={row.last_login_at} />,
      sortValue: (row) => row.last_login_at ?? 0,
    })
    return cols
  }, [filters.includeUsage, lockedRole, lockedSchoolId, schoolNames])

  const noun = lockedRole ? `${ROLE_LABELS[lockedRole].toLowerCase()}s` : 'users'
  const hasFilters = Boolean(filters.search || (!lockedRole && filters.role) || filters.status || (!lockedSchoolId && filters.schoolId))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={filters.search} onChange={(value) => patchFilters({ search: value })} placeholder="Search name or email…" className="w-64" />
        {!lockedSchoolId ? (
          <Select
            aria-label="Filter by school"
            className="w-56"
            value={filters.schoolId}
            onChange={(e) => patchFilters({ schoolId: e.target.value })}
            options={[{ value: '', label: 'All schools' }, ...(schools.data ?? []).map((school) => ({ value: school.id, label: school.name }))]}
          />
        ) : null}
        <Select
          aria-label="Filter by status"
          className="w-36"
          value={filters.status}
          onChange={(e) => patchFilters({ status: e.target.value as UserListFilters['status'] })}
          options={[
            { value: '', label: 'Any status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
        {showUsageToggle ? <Switch checked={filters.includeUsage} onChange={(checked) => patchFilters({ includeUsage: checked })} label="Usage columns" /> : null}
        <div className="flex-1" />
        {extraActions}
        {manage ? (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            {lockedRole ? `New ${ROLE_LABELS[lockedRole].toLowerCase()}` : 'New user'}
          </Button>
        ) : null}
      </div>

      {!lockedRole ? (
        <FilterChipRow>
          <FilterChip active={!filters.role} onClick={() => patchFilters({ role: '' })}>
            All roles
          </FilterChip>
          {roleChips.map((role) => (
            <FilterChip key={role} active={filters.role === role} onClick={() => patchFilters({ role: filters.role === role ? '' : role })}>
              {ROLE_LABELS[role]}
            </FilterChip>
          ))}
        </FilterChipRow>
      ) : null}

      <DataTable
        columns={columns}
        rows={users.data ?? []}
        rowKey={(row) => row.id}
        loading={users.isPending}
        refreshing={users.isPlaceholderData}
        error={users.isError ? apiErrorMessage(users.error) : null}
        onRetry={() => void users.refetch()}
        onRowClick={(row) => setSelectedId(row.id)}
        pageSize={15}
        pageResetKey={[debouncedSearch, lockedRole ?? filters.role, filters.status, lockedSchoolId ?? filters.schoolId, filters.includeUsage].join('|')}
        emptyState={
          hasFilters ? (
            <EmptyState title={`No ${noun} match`} description="Try a different search or clear the filters." />
          ) : (
            <EmptyState
              title={`No ${noun} yet`}
              description={manage ? 'Create the first account to get started.' : 'Accounts appear here once created.'}
              action={
                manage ? (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    {lockedRole ? `New ${ROLE_LABELS[lockedRole].toLowerCase()}` : 'New user'}
                  </Button>
                ) : undefined
              }
            />
          )
        }
      />

      {selectedUser
        ? (renderDrawer?.(selectedUser, () => setSelectedId(null)) ?? (
            <UserDrawer user={selectedUser} schools={schools.data ?? []} canManage={manage} onClose={() => setSelectedId(null)} />
          ))
        : null}
      {createOpen ? <CreateUserModal schools={schools.data ?? []} lockedSchoolId={lockedSchoolId} roles={createRoles} onClose={() => setCreateOpen(false)} /> : null}
    </div>
  )
}
