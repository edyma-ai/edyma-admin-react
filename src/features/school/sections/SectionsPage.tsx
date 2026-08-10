import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useAcademicYears } from '@/api/queries/curriculum'
import { useDeleteSection, useSections } from '@/api/queries/sections'
import { useMySchool } from '@/api/queries/schools'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { Section } from '@/types/sections'
import { CreateSectionModal } from '@/features/hq/schools/CreateSectionModal'
import { useSectionRosters } from '@/features/school/sections/useSectionRosters'

const CARD_GRID = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'

interface ClassGroup {
  classId: string
  className: string
  sections: Section[]
}

/** Sections sorted into per-class groups, classes and labels in natural order (Class 8 before Class 10). */
function groupByClass(sections: Section[]): ClassGroup[] {
  const collator = new Intl.Collator('en', { numeric: true })
  const byClass = new Map<string, ClassGroup>()
  for (const section of sections) {
    const group = byClass.get(section.class_id) ?? { classId: section.class_id, className: section.class_name, sections: [] }
    group.sections.push(section)
    byClass.set(section.class_id, group)
  }
  const groups = [...byClass.values()].sort((a, b) => collator.compare(a.className, b.className))
  for (const group of groups) group.sections.sort((a, b) => collator.compare(a.label, b.label))
  return groups
}

function SectionTile({ section, yearLabel, enrolled, onDelete }: { section: Section; yearLabel: string; enrolled: number | undefined; onDelete: () => void }) {
  return (
    <Card padded={false} className="relative transition-shadow hover:shadow-pop">
      <Link to={`/sections/${section.id}`} className="focus-ring flex flex-col gap-3 rounded-card p-4">
        <div className="flex items-center gap-3 pr-8">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-sky-soft font-mono text-sm font-bold text-sky-deep dark:text-sky">
            {section.label}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-ink">
              {section.class_name} · {section.label}
            </p>
            <p className="truncate text-xs text-muted">{yearLabel}</p>
          </div>
        </div>
        <p className="text-xs text-muted">
          {enrolled != null ? (
            <>
              <span className="font-mono font-semibold text-ink">{enrolled}</span> student{enrolled === 1 ? '' : 's'} enrolled
            </>
          ) : (
            '…'
          )}
        </p>
      </Link>
      <IconButton label={`Delete ${section.class_name} ${section.label}`} size="sm" icon={<Trash2 />} className="absolute right-2.5 top-2.5" onClick={onDelete} />
    </Card>
  )
}

/** School OS /sections — the school's sections grouped by class, with create and delete. */
export function SectionsPage() {
  const toast = useToast()
  const school = useMySchool()
  const sections = useSections()
  const years = useAcademicYears()
  const rosters = useSectionRosters(sections.data)
  const deleteSection = useDeleteSection()

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null)

  const yearLabels = useMemo(() => new Map((years.data ?? []).map((year) => [year.id, year.label])), [years.data])
  const groups = useMemo(() => groupByClass(sections.data ?? []), [sections.data])

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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sections"
        description="Sections group students of one class for an academic year. Open one for rosters and insights."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            New section
          </Button>
        }
      />

      {sections.isPending ? (
        <div className={CARD_GRID}>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-card" />
          ))}
        </div>
      ) : sections.isError ? (
        <Card padded={false}>
          <ErrorState message={apiErrorMessage(sections.error)} onRetry={() => void sections.refetch()} />
        </Card>
      ) : groups.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="No sections yet"
            description="Create your first section to start enrolling students and assigning teachers."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New section
              </Button>
            }
          />
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.classId} className="flex flex-col gap-3">
            <h2 className="text-[15px] font-bold tracking-tight text-ink">
              {group.className} <span className="ml-1 font-mono text-[13px] font-medium text-muted">{group.sections.length}</span>
            </h2>
            <div className={CARD_GRID}>
              {group.sections.map((section) => (
                <SectionTile
                  key={section.id}
                  section={section}
                  yearLabel={yearLabels.get(section.academic_year_id) ?? section.academic_year_id}
                  enrolled={rosters.enrolledCounts.get(section.id)}
                  onDelete={() => setDeleteTarget(section)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {createOpen ? <CreateSectionModal schoolName={school.data?.name ?? 'your school'} onClose={() => setCreateOpen(false)} /> : null}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title={`Delete ${deleteTarget ? `${deleteTarget.class_name} ${deleteTarget.label}` : 'section'}?`}
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
