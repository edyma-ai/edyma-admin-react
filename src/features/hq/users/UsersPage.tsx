import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { UsersTable } from '@/features/hq/users/UsersTable'
import { parseRole, parseStatus, type UserListFilters } from '@/features/hq/users/userFilters'

/** /users — platform-wide accounts workspace. Filters live in the URL so views are shareable. */
export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: UserListFilters = {
    search: searchParams.get('q') ?? '',
    role: parseRole(searchParams.get('role')),
    status: parseStatus(searchParams.get('status')),
    schoolId: searchParams.get('school') ?? '',
    includeUsage: searchParams.get('usage') === '1',
  }

  function onFiltersChange(next: UserListFilters) {
    setSearchParams(
      () => {
        const params = new URLSearchParams()
        if (next.search) params.set('q', next.search)
        if (next.role) params.set('role', next.role)
        if (next.status) params.set('status', next.status)
        if (next.schoolId) params.set('school', next.schoolId)
        if (next.includeUsage) params.set('usage', '1')
        return params
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Users" description="Every account on the platform. Filter by role, school and status." />
      <UsersTable filters={filters} onFiltersChange={onFiltersChange} />
    </div>
  )
}
