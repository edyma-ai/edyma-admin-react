import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useSchools } from '@/api/queries/schools'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { apiErrorMessage } from '@/lib/apiError'
import type { School } from '@/types/schools'
import { PlanBadge } from '@/features/hq/shared/PlanBadge'
import { SchoolAnalyticsTab } from '@/features/hq/schools/SchoolAnalyticsTab'
import { SchoolPlanTab } from '@/features/hq/schools/SchoolPlanTab'
import { SchoolProfileTab } from '@/features/hq/schools/SchoolProfileTab'
import { SchoolSectionsTab } from '@/features/hq/schools/SchoolSectionsTab'
import { UsersTable } from '@/features/hq/users/UsersTable'
import { emptyUserFilters, type UserListFilters } from '@/features/hq/users/userFilters'

/** The Users page workspace pinned to this school — filters stay local so they don't fight the ?tab= param. */
function SchoolUsersTab({ school }: { school: School }) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<UserListFilters>(emptyUserFilters)
  return (
    <UsersTable
      filters={filters}
      onFiltersChange={setFilters}
      lockedSchoolId={school.id}
      extraActions={
        <Button variant="secondary" icon={<Upload className="h-4 w-4" />} onClick={() => navigate(`/schools/${school.id}/import`)}>
          Import CSV
        </Button>
      }
    />
  )
}

export function SchoolDetailPage() {
  const { schoolId } = useParams()
  const { user } = useAuth()
  const schools = useSchools()
  const [searchParams, setSearchParams] = useSearchParams()

  const school = useMemo(() => schools.data?.find((entry) => entry.id === schoolId), [schools.data, schoolId])
  const isSuperAdmin = user?.role === 'super_admin'

  // Sales can't read /sections (backend allowlist), so the tab is hidden rather than rendering a 403.
  const tabs = useMemo<TabItem[]>(() => {
    const items: TabItem[] = [
      { value: 'profile', label: 'Profile' },
      { value: 'plan', label: 'Plan & features' },
    ]
    if (isSuperAdmin) items.push({ value: 'sections', label: 'Sections' })
    items.push({ value: 'users', label: 'Users' }, { value: 'analytics', label: 'Analytics' })
    return items
  }, [isSuperAdmin])

  const requestedTab = searchParams.get('tab')
  const tab = tabs.some((item) => item.value === requestedTab) ? (requestedTab as string) : 'profile'

  function setTab(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === 'profile') next.delete('tab')
        else next.set('tab', value)
        return next
      },
      { replace: true },
    )
  }

  if (schools.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }
  if (schools.isError) {
    return <ErrorState message={apiErrorMessage(schools.error)} onRetry={() => void schools.refetch()} />
  }
  if (!school) {
    return <EmptyState title="School not found" description="It may have been removed, or the link is stale." />
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[{ label: 'Schools', to: '/schools' }, { label: school.name }]}
        title={
          <span className="inline-flex flex-wrap items-center gap-2.5">
            {school.name}
            <PlanBadge planType={school.plan_type} />
          </span>
        }
        description={[school.city, school.country].filter(Boolean).join(', ') || undefined}
      />

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'profile' ? <SchoolProfileTab key={school.id} school={school} canEdit={isSuperAdmin} /> : null}
      {tab === 'plan' ? <SchoolPlanTab school={school} /> : null}
      {tab === 'sections' && isSuperAdmin ? <SchoolSectionsTab school={school} /> : null}
      {tab === 'users' ? <SchoolUsersTab school={school} /> : null}
      {tab === 'analytics' ? <SchoolAnalyticsTab school={school} /> : null}
    </div>
  )
}
