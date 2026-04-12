import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'react-feather'
import { api } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/useToast'
import type { Classroom, User } from '@/types/models'
import { apiErrorMessage } from '@/lib/apiError'

type ClassroomRow = Classroom & Record<string, unknown>

export function ClassroomsPage() {
  const nav = useNavigate()
  const { show } = useToast()
  const [rows, setRows] = useState<ClassroomRow[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    academic_year: '',
    section: '',
    is_current: true,
    primary_teacher_id: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<ClassroomRow[]>('/api/v1/classrooms')
      setRows(data)
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [show])

  const loadTeachers = useCallback(async () => {
    try {
      const { data } = await api.get<User[]>('/api/v1/admin/users?role=teacher')
      setTeachers(data)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    void load()
    void loadTeachers()
  }, [load, loadTeachers])

  async function create() {
    try {
      await api.post('/api/v1/classrooms', {
        name: form.name,
        academic_year: form.academic_year,
        section: form.section || null,
        is_current: form.is_current,
        primary_teacher_id: form.primary_teacher_id,
      })
      show('Classroom created')
      setOpen(false)
      setForm({ name: '', academic_year: '', section: '', is_current: true, primary_teacher_id: '' })
      void load()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  const columns: Column<ClassroomRow>[] = [
    { key: 'name', header: 'Name' },
    { key: 'section', header: 'Section', render: (r) => r.section ?? '—' },
    { key: 'academic_year', header: 'Year' },
    {
      key: 'is_current',
      header: 'Current',
      render: (r) => <Badge variant={r.is_current ? 'success' : 'neutral'}>{r.is_current ? 'Yes' : 'No'}</Badge>,
    },
    {
      key: 'teacher_id',
      header: 'Owner',
      render: (r) => <span className="font-mono text-xs">{r.teacher_id.slice(0, 8)}…</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Classrooms"
        description="Manage classes and open details for teachers, students, and subjects"
        actions={
          <Button
            onClick={() => {
              setOpen(true)
              void loadTeachers()
            }}
          >
            <Plus size={18} />
            New classroom
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        onRowClick={(r) => nav(`/classrooms/${r.id}`)}
      />

      <Modal
        open={open}
        title="New classroom"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void create()}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input
            label="Academic year"
            placeholder="2025-2026"
            value={form.academic_year}
            onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
            required
          />
          <Input label="Section" value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm text-brand-slate">
            <input
              type="checkbox"
              checked={form.is_current}
              onChange={(e) => setForm((f) => ({ ...f, is_current: e.target.checked }))}
            />
            Current classroom
          </label>
          <Select
            label="Primary teacher"
            placeholder="Select teacher"
            options={teachers.map((t) => ({ value: t.id, label: `${t.display_name} (${t.email})` }))}
            value={form.primary_teacher_id}
            onChange={(e) => setForm((f) => ({ ...f, primary_teacher_id: e.target.value }))}
            required
          />
        </div>
      </Modal>
    </div>
  )
}
