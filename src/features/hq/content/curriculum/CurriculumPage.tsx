import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useChapters, useClasses, useSubjects } from '@/api/queries/curriculum'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { apiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import type { ChapterListItem } from '@/types/curriculum'
import { CoverageChips } from '@/features/hq/content/curriculum/CoverageChips'
import { FixtureNote } from '@/features/hq/content/curriculum/FixtureNote'

function RailSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  )
}

interface RailItemProps {
  active: boolean
  onClick: () => void
  primary: string
  secondary?: string
}

function RailItem({ active, onClick, primary, secondary }: RailItemProps) {
  return (
    <button
      type="button"
      aria-current={active || undefined}
      onClick={onClick}
      className={cn(
        'focus-ring flex w-full items-baseline justify-between gap-2 rounded-control px-3 py-2 text-left text-[13px] transition-colors',
        active ? 'bg-sky-soft font-semibold text-sky-deep dark:text-sky' : 'text-ink hover:bg-ink/5 dark:hover:bg-white/5',
      )}
    >
      <span className="min-w-0 truncate">{primary}</span>
      {secondary ? <span className="shrink-0 font-mono text-[11px] text-muted">{secondary}</span> : null}
    </button>
  )
}

/** HQ /content/curriculum — read-only three-pane browser: classes → subjects → chapters. */
export function CurriculumPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const classes = useClasses()
  const sortedClasses = useMemo(() => [...(classes.data ?? [])].sort((a, b) => a.level - b.level), [classes.data])
  const selectedClass = sortedClasses.find((cls) => cls.id === searchParams.get('class')) ?? sortedClasses[0]

  const subjects = useSubjects(selectedClass?.id)
  const sortedSubjects = useMemo(() => [...(subjects.data ?? [])].sort((a, b) => a.order - b.order), [subjects.data])
  const selectedSubject = sortedSubjects.find((subject) => subject.id === searchParams.get('subject')) ?? sortedSubjects[0]

  const chapters = useChapters(selectedSubject?.id)
  const sortedChapters = useMemo(() => [...(chapters.data ?? [])].sort((a, b) => a.order - b.order), [chapters.data])

  const chapterColumns = useMemo<Column<ChapterListItem>[]>(
    () => [
      { key: 'order', header: '#', mono: true, width: '3rem', render: (row) => String(row.order).padStart(2, '0'), sortValue: (row) => row.order },
      {
        key: 'chapter',
        header: 'Chapter',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.name}</p>
            {row.description ? <p className="line-clamp-1 text-xs text-muted">{row.description}</p> : null}
          </div>
        ),
        sortValue: (row) => row.name,
      },
      { key: 'coverage', header: 'Coverage', render: (row) => <CoverageChips chapter={row} /> },
      { key: 'id', header: 'Chapter id', align: 'right', mono: true, render: (row) => <span className="text-xs text-muted">{row.id}</span> },
    ],
    [],
  )

  if (classes.isError) {
    return <ErrorState message={apiErrorMessage(classes.error)} onRetry={() => void classes.refetch()} />
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Curriculum" description="The master textbook every school and cohort learns from. Browse classes, subjects and chapter content." />

      <div className="grid items-start gap-4 lg:grid-cols-[13rem_15rem_minmax(0,1fr)]">
        <nav aria-label="Classes" className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
          <p className="border-b border-hairline px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted">Classes</p>
          {classes.isPending ? (
            <RailSkeleton />
          ) : (
            <div className="flex flex-col gap-0.5 p-2">
              {sortedClasses.map((cls) => (
                <RailItem
                  key={cls.id}
                  active={cls.id === selectedClass?.id}
                  onClick={() => setSearchParams({ class: cls.id })}
                  primary={cls.name}
                  secondary={`L${cls.level}`}
                />
              ))}
            </div>
          )}
        </nav>

        <nav aria-label="Subjects" className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card">
          <p className="border-b border-hairline px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted">Subjects</p>
          {subjects.isPending ? (
            <RailSkeleton />
          ) : subjects.isError ? (
            <ErrorState message={apiErrorMessage(subjects.error)} onRetry={() => void subjects.refetch()} className="py-8" />
          ) : sortedSubjects.length === 0 ? (
            <EmptyState title="No subjects" description="This class has no subjects in the fixtures yet." className="py-8" />
          ) : (
            <div className="flex flex-col gap-0.5 p-2">
              {sortedSubjects.map((subject) => (
                <RailItem
                  key={subject.id}
                  active={subject.id === selectedSubject?.id}
                  onClick={() => selectedClass && setSearchParams({ class: selectedClass.id, subject: subject.id })}
                  primary={subject.name}
                  secondary={subject.code}
                />
              ))}
            </div>
          )}
        </nav>

        <div className="flex min-w-0 flex-col gap-3">
          {selectedSubject ? (
            <p className="text-[13px] text-muted">
              <span className="font-semibold text-ink">{selectedSubject.name}</span> · <span className="font-mono text-xs">{selectedSubject.id}</span>
            </p>
          ) : null}
          <DataTable
            columns={chapterColumns}
            rows={sortedChapters}
            rowKey={(row) => row.id}
            loading={Boolean(selectedSubject) && chapters.isPending}
            error={chapters.isError ? apiErrorMessage(chapters.error) : null}
            onRetry={() => void chapters.refetch()}
            onRowClick={(row) => navigate(`/content/curriculum/chapters/${row.id}`)}
            initialSort={{ key: 'order', direction: 'asc' }}
            emptyState={<EmptyState icon={BookOpen} title="No chapters yet" description="Chapters land here when the fixtures for this subject ship." />}
          />
        </div>
      </div>

      <FixtureNote />
    </div>
  )
}
