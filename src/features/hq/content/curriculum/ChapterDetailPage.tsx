import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useChapter, useClasses, useSubjects } from '@/api/queries/curriculum'
import { Card, SectionCard } from '@/components/ui/Card'
import { CopyField } from '@/components/ui/CopyField'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs } from '@/components/ui/Tabs'
import { apiErrorMessage } from '@/lib/apiError'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { CoverageChips } from '@/features/hq/content/curriculum/CoverageChips'
import { FixtureNote } from '@/features/hq/content/curriculum/FixtureNote'
import { MarkdownView } from '@/features/hq/content/shared/MarkdownView'

type ContentTab = 'content' | 'notes' | 'cheat_sheet'

/** HQ /content/curriculum/chapters/:chapterId — rendered master content, strictly read-only. */
export function ChapterDetailPage() {
  const { chapterId } = useParams()
  const chapter = useChapter(chapterId)
  const classes = useClasses()
  const subjects = useSubjects(chapter.data?.class_id)
  const [tab, setTab] = useState<ContentTab>('content')

  const className = useMemo(
    () => classes.data?.find((cls) => cls.id === chapter.data?.class_id)?.name ?? chapter.data?.class_id,
    [classes.data, chapter.data],
  )
  const subjectName = useMemo(
    () => subjects.data?.find((subject) => subject.id === chapter.data?.subject_id)?.name ?? chapter.data?.subject_id,
    [subjects.data, chapter.data],
  )

  if (chapter.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-80" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 w-full rounded-card lg:col-span-2" />
          <Skeleton className="h-72 w-full rounded-card" />
        </div>
      </div>
    )
  }
  if (chapter.isError) {
    return <ErrorState message={apiErrorMessage(chapter.error)} onRetry={() => void chapter.refetch()} />
  }
  const data = chapter.data
  if (!data) return <EmptyState title="Chapter not found" description="It may have moved in the fixtures, or the link is stale." />

  const bodies: Record<ContentTab, string | null | undefined> = {
    content: data.markdown_content,
    notes: data.condensed_notes_md,
    cheat_sheet: data.cheat_sheet_md,
  }
  // Fall through to the first populated layer when the picked one is empty (e.g. a notes-only chapter).
  const tabOrder: ContentTab[] = ['content', 'notes', 'cheat_sheet']
  const effectiveTab = bodies[tab] ? tab : (tabOrder.find((candidate) => bodies[candidate]) ?? tab)
  const body = bodies[effectiveTab]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[{ label: 'Curriculum', to: `/content/curriculum?class=${data.class_id}&subject=${data.subject_id}` }, { label: data.name }]}
        title={data.name}
        description={`${className} · ${subjectName} · Chapter ${data.order}`}
      />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card padded={false} className="lg:col-span-2">
          <Tabs
            className="px-4"
            value={effectiveTab}
            onChange={(value) => setTab(value as ContentTab)}
            tabs={[
              { value: 'content', label: 'Content', disabled: !data.markdown_content },
              { value: 'notes', label: 'Condensed notes', disabled: !data.condensed_notes_md },
              { value: 'cheat_sheet', label: 'Cheat sheet', disabled: !data.cheat_sheet_md },
            ]}
          />
          <div className="px-5 py-4">
            {body ? (
              <MarkdownView markdown={body} />
            ) : (
              <EmptyState title="Nothing here yet" description="This chapter's fixtures don't include this content layer." />
            )}
          </div>
        </Card>

        <SectionCard title="Metadata" description="Master-data slugs, stable across environments">
          <div className="flex flex-col gap-3.5">
            <CopyField label="Chapter id" value={data.id} />
            <CopyField label="Subject id" value={data.subject_id} />
            <CopyField label="Class id" value={data.class_id} />
            {data.audio_recap_key ? <CopyField label="Audio recap key" value={data.audio_recap_key} /> : null}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Coverage</p>
              <div className="mt-1.5">
                <CoverageChips chapter={data} />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Created</dt>
                <dd className="mt-0.5">
                  <Timestamp at={data.created_at} />
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Updated</dt>
                <dd className="mt-0.5">
                  <Timestamp at={data.updated_at} />
                </dd>
              </div>
            </dl>
          </div>
        </SectionCard>
      </div>

      <FixtureNote />
    </div>
  )
}
