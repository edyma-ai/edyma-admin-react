import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAcademicYears } from '@/api/queries/curriculum'
import { useDeleteSection, useSections } from '@/api/queries/sections'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { School } from '@/types/schools'
import type { Section } from '@/types/sections'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { CreateSectionModal } from '@/features/hq/schools/CreateSectionModal'
import { SectionDrawer } from '@/features/hq/schools/SectionDrawer'

/** Sections of one school: list, create, delete, and a roster drawer per row. super_admin only — sales can't read /sections. */
export function SchoolSectionsTab({ school }: { school: School }) {
  const toast = useToast()
  const sections = useSections(school.id)
  const years = useAcademicYears()
  const deleteSection = useDeleteSection()

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null)
  const [selected, setSelected] = useState<Section | null>(null)

  const yearLabels = useMemo(() => new Map((years.data ?? []).map((year) => [year.id, year.label])), [years.data])

  const columns = useMemo<Column<Section>[]>(
    () => [
      { key: 'label', header: 'Section', render: (row) => <span className="font-semibold">{row.label}</span>, sortValue: (row) => row.label },
      { key: 'class', header: 'Class', render: (row) => row.class_name, sortValue: (row) => row.class_name },
      {
        key: 'year',
        header: 'Academic year',
        render: (row) => yearLabels.get(row.academic_year_id) ?? row.academic_year_id,
        sortValue: (row) => row.academic_year_id,
      },
      { key: 'created', header: 'Created', align: 'right', render: (row) => <Timestamp at={row.created_at} />, sortValue: (row) => row.created_at },
      {
        key: 'actions',
        header: '',
        align: 'right',
        width: '3.5rem',
        render: (row) => (
          <IconButton
            label={`Delete ${row.label}`}
            size="sm"
            icon={<Trash2 />}
            onClick={(event) => {
              event.stopPropagation()
              setDeleteTarget(row)
            }}
          />
        ),
      },
    ],
    [yearLabels],
  )

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteSection.mutateAsync(deleteTarget.id)
      toast.show(`Section ${deleteTarget.label} deleted`)
      setDeleteTarget(null)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">Sections group students of one class for an academic year. Click a row to manage its roster.</p>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
          New section
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={sections.data ?? []}
        rowKey={(row) => row.id}
        loading={sections.isPending}
        error={sections.isError ? apiErrorMessage(sections.error) : null}
        onRetry={() => void sections.refetch()}
        onRowClick={setSelected}
        initialSort={{ key: 'class', direction: 'asc' }}
        emptyState={
          <EmptyState
            title="No sections yet"
            description="Create the first section to start enrolling students."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New section
              </Button>
            }
          />
        }
      />

      {createOpen ? <CreateSectionModal schoolId={school.id} schoolName={school.name} onClose={() => setCreateOpen(false)} /> : null}
      {selected ? <SectionDrawer school={school} section={selected} onClose={() => setSelected(null)} /> : null}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title={`Delete ${deleteTarget?.label ?? 'section'}?`}
        description="The section is soft-deleted; its enrollments and teacher assignments stop resolving."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteSection.isPending} onClick={confirmDelete}>
              Delete section
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-muted">Students and teachers keep their accounts. Only the section link goes away.</p>
      </Modal>
    </div>
  )
}
