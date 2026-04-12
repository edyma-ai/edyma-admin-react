import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'react-feather'
import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/useToast'
import type { Classroom, ClassroomTeacher, EnrollmentRow, Subject, User } from '@/types/models'
import { apiErrorMessage } from '@/lib/apiError'

export function ClassroomDetailPage() {
  const { classroomId } = useParams<{ classroomId: string }>()
  const { show } = useToast()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [teachers, setTeachers] = useState<ClassroomTeacher[]>([])
  const [students, setStudents] = useState<EnrollmentRow[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allTeachers, setAllTeachers] = useState<User[]>([])
  const [allStudents, setAllStudents] = useState<User[]>([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [pickTeacher, setPickTeacher] = useState('')
  const [pickStudent, setPickStudent] = useState('')

  const fetchClassroomData = useCallback(
    async (signal?: AbortSignal) => {
      if (!classroomId) return
      try {
        const [c, t, s, sub] = await Promise.all([
          api.get<Classroom>(`/api/v1/classrooms/${classroomId}`, { signal }),
          api.get<ClassroomTeacher[]>(`/api/v1/classrooms/${classroomId}/teachers`, { signal }),
          api.get<EnrollmentRow[]>(`/api/v1/classrooms/${classroomId}/students`, { signal }),
          api.get<Subject[]>(`/api/v1/classrooms/${classroomId}/subjects`, { signal }),
        ])
        if (signal?.aborted) return
        setClassroom(c.data)
        setTeachers(t.data)
        setStudents(s.data)
        setSubjects(sub.data)
      } catch (e) {
        if (signal?.aborted) return
        show(apiErrorMessage(e), 'error')
      }
    },
    [classroomId, show],
  )

  const load = useCallback(() => fetchClassroomData(), [fetchClassroomData])

  useEffect(() => {
    const ac = new AbortController()
    // Mount fetch; setState runs only after network resolves (not synchronously in the effect body).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional load-on-params-change
    void fetchClassroomData(ac.signal)
    return () => ac.abort()
  }, [fetchClassroomData])

  async function assignTeacher() {
    if (!classroomId || !pickTeacher) return
    try {
      await api.post(`/api/v1/classrooms/${classroomId}/teachers`, { teacher_id: pickTeacher })
      show('Teacher assigned')
      setAssignOpen(false)
      setPickTeacher('')
      void load()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  async function removeTeacher(tid: string) {
    if (!classroomId) return
    try {
      await api.delete(`/api/v1/classrooms/${classroomId}/teachers/${tid}`)
      show('Teacher removed')
      void load()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  async function enroll() {
    if (!classroomId || !pickStudent) return
    try {
      await api.post(`/api/v1/classrooms/${classroomId}/students`, { student_id: pickStudent })
      show('Student enrolled')
      setEnrollOpen(false)
      setPickStudent('')
      void load()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  async function unenroll(sid: string) {
    if (!classroomId) return
    try {
      await api.delete(`/api/v1/classrooms/${classroomId}/students/${sid}`)
      show('Student removed')
      void load()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  const teacherCols: Column<ClassroomTeacher>[] = [
    { key: 'display_name', header: 'Name', render: (r) => r.display_name ?? '—' },
    { key: 'email', header: 'Email', render: (r) => r.email ?? '—' },
    { key: 'is_primary', header: 'Primary', render: (r) => (r.is_primary ? 'Yes' : '—') },
    {
      key: 'x',
      header: '',
      render: (r) =>
        r.is_primary ? null : (
          <Button variant="ghost" size="sm" onClick={() => void removeTeacher(r.teacher_id)}>
            <Trash2 size={16} />
          </Button>
        ),
    },
  ]

  const studentCols: Column<EnrollmentRow>[] = [
    { key: 'student_display_name', header: 'Name', render: (r) => r.student_display_name ?? '—' },
    { key: 'student_email', header: 'Email', render: (r) => r.student_email ?? '—' },
    {
      key: 'x',
      header: '',
      render: (r) => (
        <Button variant="ghost" size="sm" onClick={() => void unenroll(r.student_id)}>
          <Trash2 size={16} />
        </Button>
      ),
    },
  ]

  const subjectCols: Column<Subject>[] = [
    { key: 'name', header: 'Subject' },
    { key: 'code', header: 'Code', render: (r) => r.code ?? '—' },
    {
      key: 'ch',
      header: '',
      render: (r) => (
        <Link
          className="text-sm font-medium text-accent-blue hover:underline"
          to={`/classrooms/${classroomId}/subjects/${r.id}/chapters`}
        >
          Chapters
        </Link>
      ),
    },
  ]

  if (!classroomId) return null

  return (
    <div>
      <Link to="/classrooms" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand-slate">
        <ArrowLeft size={16} />
        Back to classrooms
      </Link>
      <h1 className="text-2xl font-bold text-brand-slate">{classroom?.name ?? 'Classroom'}</h1>
      <p className="mt-1 text-sm text-muted">
        {classroom?.academic_year}
        {classroom?.section ? ` · Section ${classroom.section}` : ''}
      </p>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-slate">Teachers</h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              setAssignOpen(true)
              try {
                const { data } = await api.get<User[]>('/api/v1/admin/users?role=teacher')
                setAllTeachers(data)
              } catch {
                /* ignore */
              }
            }}
          >
            <Plus size={16} />
            Assign
          </Button>
        </div>
        <DataTable columns={teacherCols} rows={teachers} rowKey={(r) => r.teacher_id} emptyMessage="No teachers" />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-slate">Students</h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              setEnrollOpen(true)
              try {
                const { data } = await api.get<User[]>('/api/v1/admin/users?role=student')
                setAllStudents(data)
              } catch {
                /* ignore */
              }
            }}
          >
            <Plus size={16} />
            Enroll
          </Button>
        </div>
        <DataTable columns={studentCols} rows={students} rowKey={(r) => r.id} emptyMessage="No students enrolled" />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-slate">Subjects</h2>
          <SubjectQuickAdd classroomId={classroomId} onDone={() => void load()} />
        </div>
        <DataTable columns={subjectCols} rows={subjects} rowKey={(r) => r.id} emptyMessage="No subjects" />
      </section>

      <Modal
        open={assignOpen}
        title="Assign teacher"
        onClose={() => setAssignOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={() => void assignTeacher()}>Assign</Button>
          </>
        }
      >
        <Select
          label="Teacher"
          placeholder="Choose"
          options={allTeachers.map((t) => ({ value: t.id, label: `${t.display_name} (${t.email})` }))}
          value={pickTeacher}
          onChange={(e) => setPickTeacher(e.target.value)}
        />
      </Modal>

      <Modal
        open={enrollOpen}
        title="Enroll student"
        onClose={() => setEnrollOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancel</Button>
            <Button onClick={() => void enroll()}>Enroll</Button>
          </>
        }
      >
        <Select
          label="Student"
          placeholder="Choose"
          options={allStudents.map((t) => ({ value: t.id, label: `${t.display_name} (${t.email})` }))}
          value={pickStudent}
          onChange={(e) => setPickStudent(e.target.value)}
        />
      </Modal>
    </div>
  )
}

function SubjectQuickAdd({ classroomId, onDone }: { classroomId: string; onDone: () => void }) {
  const { show } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  async function save() {
    try {
      await api.post(`/api/v1/classrooms/${classroomId}/subjects`, { name, code: code || null })
      show('Subject created')
      setOpen(false)
      setName('')
      setCode('')
      onDone()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Add subject</Button>
      <Modal
        open={open}
        title="New subject"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Code (optional)" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
      </Modal>
    </>
  )
}
