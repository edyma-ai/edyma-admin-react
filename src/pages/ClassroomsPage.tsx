import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'react-feather'
import { api } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/useToast'
import { useAuth } from '@/auth/useAuth'
import type { Classroom, School } from '@/types/models'
import { apiErrorMessage } from '@/lib/apiError'

type ClassroomRow = Classroom & Record<string, unknown>

export function ClassroomsPage() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const schoolFilter = searchParams.get('school_id')
  const { show } = useToast()
  const { user } = useAuth()
  const showSchoolColumn = user?.role === 'super_admin' || user?.role === 'super_sales_manager' || user?.role === 'super_content_manager'
  const [rows, setRows] = useState<ClassroomRow[]>([])
  const [loading, setLoading] = useState(true)
  const [schools, setSchools] = useState<School[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    academic_year: '',
    sections: 'A',
    is_current: true,
    school_id: '',
  })

  useEffect(() => {
    if (!showSchoolColumn) return
    api.get<School[]>('/api/v1/admin/schools').then(({ data }) => setSchools(data)).catch(() => {})
  }, [showSchoolColumn])

  const schoolNameMap = new Map(schools.map((s) => [s.id, s.name]))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<ClassroomRow[]>('/api/v1/classrooms')
      const filtered = schoolFilter
        ? data.filter((c) => c.school_id === schoolFilter)
        : data
      setRows(filtered)
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [show, schoolFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function create() {
    const sectionLabels = form.sections
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (sectionLabels.length === 0) {
      show('At least one section label is required', 'error')
      return
    }
    try {
      await api.post('/api/v1/classrooms', {
        name: form.name,
        academic_year: form.academic_year,
        sections: sectionLabels,
        is_current: form.is_current,
        school_id: form.school_id || schoolFilter || undefined,
      })
      show('Classroom created')
      setOpen(false)
      setForm({ name: '', academic_year: '', sections: 'A', is_current: true, school_id: '' })
      void load()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  const columns: Column<ClassroomRow>[] = [
    { key: 'name', header: 'Name' },
    ...(showSchoolColumn && !schoolFilter ? [{
      key: 'school',
      header: 'School',
      render: (r: ClassroomRow) => {
        const name = r.school_id ? schoolNameMap.get(r.school_id) : null
        return name ? <span className="text-sm">{name}</span> : <span className="text-xs text-muted">—</span>
      },
    }] : []),
    {
      key: 'sections',
      header: 'Sections',
      render: (r) =>
        r.sections?.length ? r.sections.map((s) => s.label).join(', ') : '—',
    },
    { key: 'academic_year', header: 'Year' },
    {
      key: 'is_current',
      header: 'Current',
      render: (r) => (
        <Badge variant={r.is_current ? 'success' : 'neutral'}>
          {r.is_current ? 'Yes' : 'No'}
        </Badge>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={schoolFilter ? 'School Classrooms' : 'Classrooms'}
        description="Manage classes and open details for teachers, students, and subjects"
        actions={
          <Button onClick={() => setOpen(true)}>
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
          <Input
            label="Academic year"
            placeholder="2025-2026"
            value={form.academic_year}
            onChange={(e) =>
              setForm((f) => ({ ...f, academic_year: e.target.value }))
            }
            required
          />
          <Input
            label="Sections (comma-separated)"
            placeholder="A, B, C"
            value={form.sections}
            onChange={(e) =>
              setForm((f) => ({ ...f, sections: e.target.value }))
            }
          />
          <label className="flex items-center gap-2 text-sm text-brand-slate">
            <input
              type="checkbox"
              checked={form.is_current}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_current: e.target.checked }))
              }
            />
            Current classroom
          </label>
        </div>
      </Modal>
    </div>
  )
}
