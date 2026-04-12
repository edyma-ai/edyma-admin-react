import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit3, Plus, Trash2 } from 'react-feather'
import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import type { Chapter, Subject } from '@/types/models'
import { apiErrorMessage } from '@/lib/apiError'

export function SubjectChaptersPage() {
  const { classroomId, subjectId } = useParams<{ classroomId: string; subjectId: string }>()
  const navigate = useNavigate()
  const { show } = useToast()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', order: 1 })

  const fetchChaptersData = useCallback(
    async (signal?: AbortSignal) => {
      if (!classroomId || !subjectId) return
      setLoading(true)
      setError(null)
      try {
        const [sub, ch] = await Promise.all([
          api.get<Subject>(`/api/v1/classrooms/${classroomId}/subjects/${subjectId}`, { signal }),
          api.get<Chapter[]>(`/api/v1/chapters?subject_id=${subjectId}&classroom_id=${classroomId}`, {
            signal,
          }),
        ])
        if (signal?.aborted) return
        setSubject(sub.data)
        setChapters(ch.data)
      } catch (e) {
        if (signal?.aborted) return
        setError(apiErrorMessage(e))
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [classroomId, subjectId],
  )

  const load = useCallback(() => fetchChaptersData(), [fetchChaptersData])

  useEffect(() => {
    const ac = new AbortController()
    void fetchChaptersData(ac.signal)
    return () => ac.abort()
  }, [fetchChaptersData])

  async function create() {
    if (!classroomId || !subjectId) return
    try {
      await api.post('/api/v1/chapters', {
        name: form.name,
        description: form.description || null,
        subject_id: subjectId,
        classroom_id: classroomId,
        order: form.order,
      })
      show('Chapter created')
      setOpen(false)
      setForm({ name: '', description: '', order: chapters.length + 1 })
      void load()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/api/v1/chapters/${id}`)
      show('Chapter deleted')
      void load()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  const columns: Column<Chapter>[] = [
    { key: 'order', header: '#', className: 'w-12' },
    { key: 'name', header: 'Chapter' },
    {
      key: 'description',
      header: 'Description',
      render: (r) =>
        r.description
          ? r.description.slice(0, 60) + (r.description.length > 60 ? '…' : '')
          : '—',
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/classrooms/${classroomId}/subjects/${subjectId}/chapters/${r.id}`)
            }}
          >
            <Edit3 size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              void remove(r.id)
            }}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ]

  if (!classroomId || !subjectId) return null

  return (
    <div>
      <Link
        to={`/classrooms/${classroomId}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand-slate"
      >
        <ArrowLeft size={16} />
        Back to classroom
      </Link>
      <h1 className="text-2xl font-bold text-brand-slate">Chapters</h1>
      {!loading && subject && <p className="mt-1 text-sm text-muted">{subject.name}</p>}

      {error ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <Button className="mb-4" onClick={() => setOpen(true)}>
            <Plus size={18} />
            Add chapter
          </Button>
          <DataTable
            columns={columns}
            rows={chapters}
            rowKey={(r) => r.id}
            emptyMessage="No chapters"
            loading={loading}
            onRowClick={(r) =>
              navigate(`/classrooms/${classroomId}/subjects/${subjectId}/chapters/${r.id}`)
            }
          />
        </div>
      )}

      <Modal
        open={open}
        title="New chapter"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void create()}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="Order"
            type="number"
            min={1}
            value={String(form.order)}
            onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) || 1 }))}
          />
        </div>
      </Modal>
    </div>
  )
}
