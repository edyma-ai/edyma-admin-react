import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Plus } from 'lucide-react'
import { useAssessments } from '@/api/queries/assessments'
import { useSections } from '@/api/queries/sections'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterChip, FilterChipRow } from '@/components/ui/FilterChip'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { apiErrorMessage } from '@/lib/apiError'
import { formatDate, formatNumber } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import type { Assessment, AssessmentStatus } from '@/types/assessments'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { AssessmentStatusBadge, SectionBadges } from '@/features/shared/assessments/AssessmentBadges'
import { useSubjectNames } from '@/features/shared/assessments/useSubjectNames'
import { featureGateMessage, FeatureGateNotice } from '@/features/hq/content/shared/FeatureGateNotice'

type StatusFilter = AssessmentStatus | 'all'

const PAGE_SIZE = 15

/** HQ /content/assessments — the Edyma team's authoring list (author = me, server-scoped, server-paged). */
export function ContentAssessmentsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<StatusFilter>('all')
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

  // Status narrows within the fetched page — the endpoint has no status param, and page-scoped counts would mislead.
  const rows = useMemo(
    () => (assessments.data?.items ?? []).filter((row) => status === 'all' || row.status === status),
    [assessments.data?.items, status],
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
        render: (row) => subjectNames.get(row.subject_id) ?? <span className="font-mono text-xs">{row.subject_id}</span>,
        sortValue: (row) => subjectNames.get(row.subject_id) ?? row.subject_id,
      },
      { key: 'sections', header: 'Targets', render: (row) => <SectionBadges ids={row.section_ids} labels={sectionLabels} /> },
      {
        key: 'questions',
        header: 'Questions',
        align: 'right',
        mono: true,
        render: (row) => formatNumber(row.questions.length),
        sortValue: (row) => row.questions.length,
      },
      { key: 'status', header: 'Status', render: (row) => <AssessmentStatusBadge status={row.status} />, sortValue: (row) => row.status },
      {
        key: 'due',
        header: 'Due',
        align: 'right',
        mono: true,
        render: (row) => (row.due_date ? formatDate(row.due_date) : <span className="text-muted">—</span>),
        sortValue: (row) => row.due_date ?? 0,
      },
      { key: 'updated', header: 'Updated', align: 'right', render: (row) => <Timestamp at={row.updated_at} />, sortValue: (row) => row.updated_at },
    ],
    [subjectNames, sectionLabels],
  )

  const gate = assessments.isError ? featureGateMessage(assessments.error) : null

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Assessments"
        description="Edyma-authored assessments over the same endpoints teachers use. Yours only, targeting retail cohorts and school sections."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/content/assessments/new')}>
            New assessment
          </Button>
        }
      />

      {gate ? (
        <FeatureGateNotice feature="Assessments" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by title…" className="w-64" />
            <FilterChipRow>
              <FilterChip active={status === 'all'} onClick={() => setStatus('all')}>
                All
              </FilterChip>
              <FilterChip active={status === 'draft'} onClick={() => setStatus('draft')}>
                Draft
              </FilterChip>
              <FilterChip active={status === 'published'} onClick={() => setStatus('published')}>
                Published
              </FilterChip>
            </FilterChipRow>
          </div>

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            loading={assessments.isPending}
            refreshing={assessments.isPlaceholderData}
            error={assessments.isError ? apiErrorMessage(assessments.error) : null}
            onRetry={() => void assessments.refetch()}
            onRowClick={(row) => navigate(`/content/assessments/${row.id}`)}
            serverPagination={{ page, pageSize: PAGE_SIZE, total: assessments.data?.total ?? undefined, hasMore: (assessments.data?.items ?? []).length === PAGE_SIZE, onPageChange: setPage }}
            initialSort={{ key: 'updated', direction: 'desc' }}
            emptyState={
              <EmptyState
                icon={ClipboardList}
                title={q ? `No matches for "${q}"` : status === 'all' ? 'Nothing authored yet' : `No ${status} assessments`}
                description={
                  q
                    ? 'Try a shorter search, or clear it to see everything you authored.'
                    : 'Author an assessment for a retail cohort or a school section. Students see it in the app the moment you publish.'
                }
                action={
                  q ? undefined : (
                    <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate('/content/assessments/new')}>
                      New assessment
                    </Button>
                  )
                }
              />
            }
          />
        </>
      )}
    </div>
  )
}
