import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssessments } from '@/api/queries/assessments'
import { useSections } from '@/api/queries/sections'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { apiErrorMessage } from '@/lib/apiError'
import { formatDate } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import type { Assessment } from '@/types/assessments'
import { AssessmentStatusBadge, SectionBadges } from '@/features/shared/assessments/AssessmentBadges'
import { useSubjectNames } from '@/features/shared/assessments/useSubjectNames'

const PAGE_SIZE = 15

/** School OS /assessments — read-only list of every assessment targeting the school's sections (server-scoped, server-paged). */
export function AssessmentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebouncedValue(search.trim(), 300)

  // A new search reshapes the result set — snap back to page 1.
  const [prevQ, setPrevQ] = useState(q)
  if (q !== prevQ) {
    setPrevQ(q)
    setPage(1)
  }

  const assessments = useAssessments({ q: q || undefined, page, pageSize: PAGE_SIZE })
  const sections = useSections()

  const classIds = useMemo(
    () => [...new Set((assessments.data?.items ?? []).map((row) => row.class_id).filter((id): id is string => Boolean(id)))].sort(),
    [assessments.data?.items],
  )
  const subjectNames = useSubjectNames(classIds)
  const sectionLabels = useMemo(
    () => new Map((sections.data ?? []).map((section) => [section.id, `${section.class_name} ${section.label}`])),
    [sections.data],
  )

  const columns = useMemo<Column<Assessment>[]>(
    () => [
      {
        key: 'title',
        header: 'Assessment',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.title}</p>
            {row.description ? <p className="truncate text-xs text-muted">{row.description}</p> : null}
          </div>
        ),
        sortValue: (row) => row.title,
      },
      {
        key: 'subject',
        header: 'Subject',
        render: (row) => subjectNames.get(row.subject_id) ?? row.subject_id,
        sortValue: (row) => subjectNames.get(row.subject_id) ?? row.subject_id,
      },
      { key: 'sections', header: 'Sections', render: (row) => <SectionBadges ids={row.section_ids} labels={sectionLabels} /> },
      { key: 'status', header: 'Status', render: (row) => <AssessmentStatusBadge status={row.status} />, sortValue: (row) => row.status },
      {
        key: 'due',
        header: 'Due',
        align: 'right',
        mono: true,
        render: (row) => (row.due_date ? formatDate(row.due_date) : <span className="text-muted">—</span>),
        sortValue: (row) => row.due_date ?? 0,
      },
    ],
    [subjectNames, sectionLabels],
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Assessments"
        description="Read-only. Everything targeting your sections, authored by your teachers or the Edyma team."
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Search by title…" className="max-w-xs" />
      <DataTable
        columns={columns}
        rows={assessments.data?.items ?? []}
        rowKey={(row) => row.id}
        loading={assessments.isPending}
        refreshing={assessments.isPlaceholderData}
        error={assessments.isError ? apiErrorMessage(assessments.error) : null}
        onRetry={() => void assessments.refetch()}
        onRowClick={(row) => navigate(`/assessments/${row.id}`)}
        serverPagination={{ page, pageSize: PAGE_SIZE, total: assessments.data?.total ?? undefined, onPageChange: setPage }}
        emptyState={
          q ? (
            <EmptyState title={`No matches for "${q}"`} description="Try a shorter search, or clear it to see every assessment." />
          ) : (
            <EmptyState
              title="No assessments yet"
              description="Assessments your teachers or the Edyma team create for your sections appear here."
            />
          )
        }
      />
    </div>
  )
}
