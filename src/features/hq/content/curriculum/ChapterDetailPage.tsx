import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Clapperboard, ExternalLink, Zap } from 'lucide-react'
import { useChapter, useClasses, useSubjects } from '@/api/queries/curriculum'
import { Badge } from '@/components/ui/Badge'
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
import { InteractiveEmbed } from '@/features/hq/content/shared/InteractiveEmbed'
import { MarkdownView } from '@/features/hq/content/shared/MarkdownView'
import { resolveS3Url } from '@/lib/s3'
import type { ChapterVideo } from '@/types/curriculum'

type ContentTab = 'content' | 'notes' | 'cheat_sheet' | 'videos' | 'interactive'

function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

/** One Watch-tab video: thumbnail, title, length, and a way to open it. */
function VideoRow({ video }: { video: ChapterVideo }) {
  const [thumb, setThumb] = useState<string | null>(null)
  const [href, setHref] = useState<string | null>(video.source === 'youtube' ? video.url_or_key : null)

  useEffect(() => {
    let cancelled = false
    if (video.thumbnail_key) {
      resolveS3Url(`s3://edyma/${video.thumbnail_key}`)
        .then((url) => {
          if (!cancelled) setThumb(url)
        })
        .catch(() => undefined)
    }
    // An S3 video is opened through a presigned link, which is what the app's
    // player streams from; YouTube links are already public.
    if (video.source !== 'youtube') {
      resolveS3Url(`s3://edyma/${video.url_or_key}`)
        .then((url) => {
          if (!cancelled) setHref(url)
        })
        .catch(() => undefined)
    }
    return () => {
      cancelled = true
    }
  }, [video])

  const duration = formatDuration(video.duration_sec)
  return (
    <li className="flex items-center gap-3 rounded-card border border-hairline p-2.5">
      <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-ink/5 dark:bg-white/10">
        {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <Clapperboard className="m-auto mt-4 h-5 w-5 text-muted" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{video.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
          <Badge tone="neutral">{video.source}</Badge>
          {duration ? <span className="font-mono">{duration}</span> : null}
          {video.topic_id ? <span className="font-mono">{video.topic_id}</span> : null}
          <span className="font-mono">{video.id}</span>
        </p>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-sky hover:underline">
          Open <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </li>
  )
}

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

  const videos = data.videos ?? []
  const sims = data.interactive_elements ?? []
  const bodies: Record<ContentTab, string | null | undefined> = {
    content: data.markdown_content,
    notes: data.condensed_notes_md,
    cheat_sheet: data.cheat_sheet_md,
    videos: videos.length ? 'videos' : null,
    interactive: sims.length ? 'interactive' : null,
  }
  // Fall through to the first populated layer when the picked one is empty (e.g. a notes-only chapter).
  const tabOrder: ContentTab[] = ['content', 'notes', 'cheat_sheet', 'videos', 'interactive']
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
              { value: 'videos', label: videos.length ? `Videos (${videos.length})` : 'Videos', disabled: !videos.length },
              { value: 'interactive', label: sims.length ? `Interactive (${sims.length})` : 'Interactive', disabled: !sims.length },
            ]}
          />
          <div className="px-5 py-4">
            {effectiveTab === 'videos' && videos.length ? (
              <ul className="flex flex-col gap-2">
                {videos.map((video) => (
                  <VideoRow key={video.id} video={video} />
                ))}
              </ul>
            ) : effectiveTab === 'interactive' && sims.length ? (
              <div className="flex flex-col gap-6">
                {sims.map((sim) => (
                  <section key={sim.id}>
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Zap className="h-4 w-4 text-sky" /> {sim.title}
                    </h3>
                    {sim.description ? <p className="mt-0.5 text-[13px] text-muted">{sim.description}</p> : null}
                    <InteractiveEmbed slug={sim.id} className="mt-2" />
                  </section>
                ))}
              </div>
            ) : body ? (
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
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <CoverageChips chapter={data} />
                {videos.length ? (
                  <Badge tone="sky" icon={<Clapperboard aria-hidden className="h-3 w-3" />}>
                    {videos.length} video{videos.length === 1 ? '' : 's'}
                  </Badge>
                ) : null}
                {sims.length ? (
                  <Badge tone="sky" icon={<Zap aria-hidden className="h-3 w-3" />}>
                    {sims.length} interactive
                  </Badge>
                ) : null}
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
