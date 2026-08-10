import { useMemo, useState } from 'react'
import { GraduationCap, Sparkles, Store } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useAcademicYears } from '@/api/queries/curriculum'
import { useRetailTenant } from '@/api/queries/retail'
import { useSections } from '@/api/queries/sections'
import { useAdminUsers } from '@/api/queries/users'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { apiErrorMessage } from '@/lib/apiError'
import { formatNumber } from '@/lib/format'
import type { Section } from '@/types/sections'
import type { AdminUser } from '@/types/users'
import { MiniStat } from '@/features/hq/shared/MiniStat'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { useSectionRosters } from '@/features/school/sections/useSectionRosters'
import { ActivateStudentModal, type ActivationPrefill } from '@/features/hq/retail/ActivateStudentModal'

const RETAIL_COHORT_LABEL = 'Edyma Cohort'

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
      <p className="mt-0.5 text-[13px] text-muted">{description}</p>
    </div>
  )
}

interface StudentsTableProps {
  tenantId: string
  /** null when the viewer can't read rosters (sales) — the cohort column degrades gracefully. */
  cohortByStudent: Map<string, Section> | null
  onActivate: (prefill: ActivationPrefill) => void
}

function StudentsTable({ tenantId, cohortByStudent, onActivate }: StudentsTableProps) {
  const students = useAdminUsers({ school_id: tenantId, role: 'student' })

  const columns = useMemo<Column<AdminUser>[]>(
    () => [
      {
        key: 'student',
        header: 'Student',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.display_name}</p>
            <p className="truncate text-xs text-muted">{row.email}</p>
          </div>
        ),
        sortValue: (row) => row.display_name,
      },
      {
        key: 'cohort',
        header: 'Cohort',
        render: (row) => {
          if (!cohortByStudent) return <Badge tone="sky">Retail tenant</Badge>
          const cohort = cohortByStudent.get(row.id)
          return cohort ? <Badge tone="success">{cohort.class_name}</Badge> : <Badge tone="warning">Not enrolled</Badge>
        },
        sortValue: (row) => cohortByStudent?.get(row.id)?.class_name ?? '',
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <Badge tone={row.account_status === 'active' ? 'success' : 'neutral'}>{row.account_status === 'active' ? 'Active' : 'Inactive'}</Badge>,
        sortValue: (row) => row.account_status,
      },
      { key: 'last_login', header: 'Last login', align: 'right', render: (row) => <Timestamp at={row.last_login_at} />, sortValue: (row) => row.last_login_at ?? 0 },
    ],
    [cohortByStudent],
  )

  return (
    <DataTable
      columns={columns}
      rows={students.data ?? []}
      rowKey={(row) => row.id}
      loading={students.isPending}
      refreshing={students.isPlaceholderData}
      error={students.isError ? apiErrorMessage(students.error) : null}
      onRetry={() => void students.refetch()}
      onRowClick={(row) => onActivate({ user: row })}
      pageSize={15}
      emptyState={
        <EmptyState
          icon={GraduationCap}
          title="No individual students yet"
          description="Activate the first one from a student lead in the pipeline, or directly with the button above."
        />
      }
    />
  )
}

/**
 * Retail overview: the Edyma Academy tenant's class cohorts and individual
 * students, plus the activation flow. Role-aware — sales sees students but not
 * sections; content sees cohorts but not student listings; super admin both.
 */
export function RetailPage() {
  const { user: me } = useAuth()
  const role = me?.role
  const canListStudents = role === 'super_admin' || role === 'super_sales_manager'
  const canListSections = role === 'super_admin' || role === 'super_content_manager'
  const canReadRosters = role === 'super_admin'

  // The tenant comes from the dedicated endpoint (plan_type 'retail' server-side) —
  // never inferred from section labels, which any school could reuse.
  const tenant = useRetailTenant()
  const tenantId = tenant.data?.school_id ?? undefined

  const sectionsEnabled = canListSections && Boolean(tenantId)
  const sections = useSections(tenantId, sectionsEnabled)
  const cohorts = useMemo(() => (sections.data ?? []).filter((section) => section.label === RETAIL_COHORT_LABEL), [sections.data])

  const years = useAcademicYears()
  const yearLabels = useMemo(() => new Map((years.data ?? []).map((year) => [year.id, year.label])), [years.data])

  const rosters = useSectionRosters(canReadRosters ? cohorts : undefined)
  const cohortByStudent = useMemo(() => {
    if (!canReadRosters) return null
    const cohortsById = new Map(cohorts.map((section) => [section.id, section]))
    const map = new Map<string, Section>()
    for (const [studentId, sectionId] of rosters.sectionIdByStudent) {
      const cohort = cohortsById.get(sectionId)
      if (cohort) map.set(studentId, cohort)
    }
    return map
  }, [canReadRosters, cohorts, rosters.sectionIdByStudent])

  const [activatePrefill, setActivatePrefill] = useState<ActivationPrefill | null>(null)

  const cohortColumns = useMemo<Column<Section>[]>(() => {
    const cols: Column<Section>[] = [
      { key: 'class', header: 'Class', render: (row) => <span className="font-semibold">{row.class_name}</span>, sortValue: (row) => row.class_name },
      {
        key: 'year',
        header: 'Academic year',
        render: (row) => yearLabels.get(row.academic_year_id) ?? row.academic_year_id,
        sortValue: (row) => row.academic_year_id,
      },
    ]
    if (canReadRosters) {
      cols.push({
        key: 'enrolled',
        header: 'Enrolled',
        mono: true,
        align: 'right',
        render: (row) => (rosters.isLoading ? '…' : formatNumber(rosters.enrolledCounts.get(row.id) ?? 0)),
        sortValue: (row) => rosters.enrolledCounts.get(row.id) ?? 0,
      })
    }
    cols.push({ key: 'created', header: 'Created', align: 'right', render: (row) => <Timestamp at={row.created_at} />, sortValue: (row) => row.created_at })
    return cols
  }, [yearLabels, canReadRosters, rosters.isLoading, rosters.enrolledCounts])

  const resolving = tenant.isPending || (sectionsEnabled && sections.isPending)
  const enrolledTotal = canReadRosters && !rosters.isLoading ? [...rosters.enrolledCounts.values()].reduce((sum, count) => sum + count, 0) : null

  if (resolving) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (tenant.isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Retail" description="Individual students on the Edyma Academy tenant." />
        <Card padded={false}>
          <ErrorState message={apiErrorMessage(tenant.error)} onRetry={() => void tenant.refetch()} />
        </Card>
      </div>
    )
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Retail" description="Individual students on the Edyma Academy tenant." />
        <Card>
          <EmptyState
            icon={Store}
            title="No retail tenant yet"
            description="Individual students live in a dedicated school with plan type 'retail' (Edyma Academy). Once a super admin creates it, activations enroll students into per-class Edyma Cohort sections automatically."
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2.5">
            {tenant.data?.school_name ?? 'Retail'}
            <Badge tone="warning">Retail</Badge>
          </span>
        }
        description="Individual-plan students, their class cohorts and activations."
        actions={
          <Button icon={<GraduationCap className="h-4 w-4" />} onClick={() => setActivatePrefill({})}>
            Activate student
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {canListSections ? <MiniStat label="Class cohorts" value={formatNumber(cohorts.length)} caption="One shared section per activated class" /> : null}
        {enrolledTotal != null ? <MiniStat label="Cohort enrollments" value={formatNumber(enrolledTotal)} caption="Students currently placed in a cohort" /> : null}
        {role === 'super_content_manager' ? <MiniStat label="Your access" value="Activate" caption="Student listings need a sales or admin role" /> : null}
      </div>

      {canListStudents ? (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Individual students" description="Everyone on the retail tenant. Click a row to activate or move them to another class cohort." />
          <StudentsTable tenantId={tenantId} cohortByStudent={cohortByStudent} onActivate={setActivatePrefill} />
        </section>
      ) : null}

      {canListSections ? (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Class cohorts" description="Shared Edyma Cohort sections. Activations create and fill these per class." />
          <DataTable
            columns={cohortColumns}
            rows={cohorts}
            rowKey={(row) => row.id}
            error={sections.isError ? apiErrorMessage(sections.error) : null}
            onRetry={() => void sections.refetch()}
            initialSort={{ key: 'class', direction: 'asc' }}
            emptyState={
              <EmptyState
                icon={Sparkles}
                title="No cohorts yet"
                description="The first activation in a class creates its Edyma Cohort section automatically. Nothing to set up by hand."
              />
            }
          />
        </section>
      ) : null}

      {activatePrefill ? <ActivateStudentModal prefill={activatePrefill} onClose={() => setActivatePrefill(null)} /> : null}
    </div>
  )
}
