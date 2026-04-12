import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'react-feather'
import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useToast } from '@/components/ui/useToast'
import type { Chapter } from '@/types/models'
import { apiErrorMessage } from '@/lib/apiError'

export function ChapterDetailPage() {
  const { classroomId, subjectId, chapterId } = useParams<{
    classroomId: string
    subjectId: string
    chapterId: string
  }>()
  const { show } = useToast()

  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState(1)
  const [savingMeta, setSavingMeta] = useState(false)

  const [markdownContent, setMarkdownContent] = useState('')
  const [savingContent, setSavingContent] = useState(false)

  const fetchChapter = useCallback(
    async (signal?: AbortSignal) => {
      if (!chapterId) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.get<Chapter>(`/api/v1/chapters/${chapterId}`, { signal })
        if (signal?.aborted) return
        const ch = res.data
        setChapter(ch)
        setName(ch.name)
        setDescription(ch.description ?? '')
        setOrder(ch.order)
        setMarkdownContent(ch.markdown_content ?? '')
      } catch (e) {
        if (signal?.aborted) return
        setError(apiErrorMessage(e))
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [chapterId],
  )

  useEffect(() => {
    const ac = new AbortController()
    void fetchChapter(ac.signal)
    return () => ac.abort()
  }, [fetchChapter])

  async function saveMeta() {
    if (!chapterId) return
    setSavingMeta(true)
    try {
      const res = await api.put<Chapter>(`/api/v1/chapters/${chapterId}`, {
        name,
        description: description || null,
        order,
      })
      setChapter(res.data)
      show('Chapter metadata saved')
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    } finally {
      setSavingMeta(false)
    }
  }

  async function saveContent() {
    if (!chapterId) return
    setSavingContent(true)
    try {
      const res = await api.put<Chapter>(`/api/v1/chapters/${chapterId}`, {
        markdown_content: markdownContent,
      })
      setChapter(res.data)
      show('Content saved')
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    } finally {
      setSavingContent(false)
    }
  }

  if (!classroomId || !subjectId || !chapterId) return null

  const backPath = `/classrooms/${classroomId}/subjects/${subjectId}/chapters`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" className="text-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Link
          to={backPath}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand-slate"
        >
          <ArrowLeft size={16} />
          Back to chapters
        </Link>
        <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button variant="outline" onClick={() => void fetchChapter()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!chapter) return null

  const metaDirty =
    name !== chapter.name ||
    (description || null) !== (chapter.description ?? null) ||
    order !== chapter.order

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to={backPath}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand-slate"
      >
        <ArrowLeft size={16} />
        Back to chapters
      </Link>

      <h1 className="text-2xl font-bold text-brand-slate">{chapter.name}</h1>
      <p className="mt-1 text-xs text-muted">ID: {chapter.id}</p>

      {/* Metadata section */}
      <section className="mt-8 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-slate">Metadata</h2>
          <Button
            size="sm"
            onClick={() => void saveMeta()}
            disabled={savingMeta || !metaDirty}
          >
            {savingMeta ? <Spinner size="sm" /> : <Save size={15} />}
            Save
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Order"
            type="number"
            min={1}
            value={String(order)}
            onChange={(e) => setOrder(Number(e.target.value) || 1)}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </section>

      {/* Content section */}
      <section className="mt-6 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-slate">Content</h2>
          <Button size="sm" onClick={() => void saveContent()} disabled={savingContent}>
            {savingContent ? <Spinner size="sm" /> : <Save size={15} />}
            Save content
          </Button>
        </div>
        <RichTextEditor content={markdownContent} onChange={setMarkdownContent} />
      </section>
    </div>
  )
}
