import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { PageHeader } from '@/components/ui/PageHeader'
import { UsersTable } from '@/features/hq/users/UsersTable'
import { parseStatus, type UserListFilters } from '@/features/hq/users/userFilters'
import { PersonDrawer } from '@/features/school/people/PersonDrawer'

type PeopleRole = 'teacher' | 'student'

const COPY: Record<PeopleRole, { title: string; description: string }> = {
  teacher: { title: 'Teachers', description: 'Teacher accounts at your school. Assign them to sections from a section’s Teachers tab.' },
  student: { title: 'Students', description: 'Student accounts at your school. Open one to see their section and account controls.' },
}

/** School OS /teachers and /students — the scoped users workspace pinned to one role. */
export function PeoplePage({ role }: { role: PeopleRole }) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: UserListFilters = {
    search: searchParams.get('q') ?? '',
    role: '',
    status: parseStatus(searchParams.get('status')),
    schoolId: '',
    includeUsage: false,
  }

  function onFiltersChange(next: UserListFilters) {
    setSearchParams(
      () => {
        const params = new URLSearchParams()
        if (next.search) params.set('q', next.search)
        if (next.status) params.set('status', next.status)
        return params
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={COPY[role].title} description={COPY[role].description} />
      <UsersTable
        key={role}
        filters={filters}
        onFiltersChange={onFiltersChange}
        lockedSchoolId={user?.school_id ?? undefined}
        lockedRole={role}
        canManage
        createRoles={[role]}
        showUsageToggle={false}
        renderDrawer={(person, onClose) => <PersonDrawer user={person} onClose={onClose} />}
      />
    </div>
  )
}
