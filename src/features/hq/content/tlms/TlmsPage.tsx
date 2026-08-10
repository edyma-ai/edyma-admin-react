import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus } from 'lucide-react'
import { useTlms } from '@/api/queries/tlm'
import { useSections } from '@/api/queries/sections'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterChip, FilterChipRow } from '@/components/ui/FilterChip'
import { PageHeader } from '@/components/ui/PageHeader'
import { apiErrorMessage } from '@/lib/apiError'
import type { Tlm } from '@/types/tlm'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { SectionBadges } from '@/features/shared/assessments/AssessmentBadges'
import { featureGateMessage, FeatureGateNotice } from '@/features/hq/content/shared/FeatureGateNotice'
import { TlmStatusBadge, tlmStage } from '@/features/hq/content/tlms/tlmMeta'

type StatusFilter = 'all' | 'draft' | 'shared'

/** HQ /content/tlms — the Edyma team's study-guide modules (author = me, server-scoped). */
export function TlmsPage() {
  const navigate = useNavigate()
  const tlms = useTlms()
  const sections = useSections()
  const [status, setStatus] = useState<StatusFilter>('all')

  const sectionLabels = useMemo(
    () => new Map((sections.data ?? []).map((section) => [section.id, `${section.class_name} ${section.label}`])),
    [sections.data],
  )

  const rows = useMemo(() => (tlms.data ?? []).filter((row) => status === 'all' || row.status === status), [tlms.data, status])
  const counts = useMemo(() => {
    const all = tlms.data ?? []
    return { all: all.length, draft: all.filter((row) => row.status === 'draft').length, shared: all.filter((row) => row.status === 'shared').length }
  }, [tlms.data])

  const columns = useMemo<Column<Tlm>[]>(
    () => [
      { key: 'title', header: 'Module', render: (row) => <span className="font-semibold text-ink">{row.title}</span>, sortValue: (row) => row.title },
      { key: 'targets', header: 'Targets', render: (row) => <SectionBadges ids={row.section_ids} labels={sectionLabels} /> },
      { key: 'status', header: 'Status', render: (row) => <TlmStatusBadge status={row.status} />, sortValue: (row) => row.status },
      { key: 'stage', header: 'Stage', render: (row) => <span className="text-[13px] text-muted">{tlmStage(row)}</span>, sortValue: (row) => tlmStage(row) },
      { key: 'updated', header: 'Updated', align: 'right', render: (row) => <Timestamp at={row.updated_at} />, sortValue: (row) => row.updated_at },
    ],
    [sectionLabels],
  )

  const gate = tlms.isError ? featureGateMessage(tlms.error) : null

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="TLMs"
        description="Teaching-learning modules: AI drafts an outline, you steer it with comments, then share the final study guide with students."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/content/tlms/new')}>
            New TLM
          </Button>
        }
      />

      {gate ? (
        <FeatureGateNotice feature="TLM study guides" />
      ) : (
        <>
          <FilterChipRow>
            <FilterChip active={status === 'all'} count={counts.all} onClick={() => setStatus('all')}>
              All
            </FilterChip>
            <FilterChip active={status === 'draft'} count={counts.draft} onClick={() => setStatus('draft')}>
              Draft
            </FilterChip>
            <FilterChip active={status === 'shared'} count={counts.shared} onClick={() => setStatus('shared')}>
              Shared
            </FilterChip>
          </FilterChipRow>

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            loading={tlms.isPending}
            error={tlms.isError ? apiErrorMessage(tlms.error) : null}
            onRetry={() => void tlms.refetch()}
            onRowClick={(row) => navigate(`/content/tlms/${row.id}`)}
            pageSize={15}
            pageResetKey={status}
            initialSort={{ key: 'updated', direction: 'desc' }}
            emptyState={
              <EmptyState
                icon={Layers}
                title={status === 'all' ? 'No modules yet' : `No ${status} modules`}
                description="Start one: pick the target sections and chapters, and AI drafts the outline for your review."
                action={
                  <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate('/content/tlms/new')}>
                    New TLM
                  </Button>
                }
              />
            }
          />
        </>
      )}
    </div>
  )
}
