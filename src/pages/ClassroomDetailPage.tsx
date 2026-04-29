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
import type { Classroom, Section, SectionTeacher, EnrollmentRow, Subject, User } from '@/types/models'
import { apiErrorMessage } from '@/lib/apiError'

type Tab = 'sections' | 'subjects'

export function ClassroomDetailPage() {
  const { classroomId } = useParams<{ classroomId: string }>()
  const { show } = useToast()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tab, setTab] = useState<Tab>('sections')

  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [newSectionLabel, setNewSectionLabel] = useState('')

  const load = useCallback(async () => {
    if (!classroomId) return
    try {
      const [c, sub] = await Promise.all([
        api.get<Classroom>(`/api/v1/classrooms/${classroomId}`),
        api.get<Subject[]>(`/api/v1/classrooms/${classroomId}/subjects`),
      ])
      setClassroom(c.data)
      setSubjects(sub.data)
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }, [classroomId, show])

  useEffect(() => {
    void load()
  }, [load])

  async function addSection() {
    if (!classroomId || !newSectionLabel.trim()) return
    try {
      await api.post(`/api/v1/classrooms/${classroomId}/sections`, { label: newSectionLabel.trim() })
      show('Section added')
      setAddSectionOpen(false)
      setNewSectionLabel('')
      void load()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

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

  const sections = classroom?.sections ?? []

  return (
    <div>
      <Link to="/classrooms" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand-slate">
        <ArrowLeft size={16} />
        Back to classrooms
      </Link>
      <h1 className="text-2xl font-bold text-brand-slate">{classroom?.name ?? 'Classroom'}</h1>
      <p className="mt-1 text-sm text-muted">
        {classroom?.academic_year}
        {sections.length > 0 && ` · Sections: ${sections.map((s) => s.label).join(', ')}`}
      </p>

      {/* Tabs */}
      <div className="mt-6 flex gap-4 border-b border-gray-200">
        {(['sections', 'subjects'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`pb-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-accent-blue text-accent-blue' : 'text-muted hover:text-brand-slate'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'sections' && (
        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-slate">Sections</h2>
            <Button size="sm" onClick={() => setAddSectionOpen(true)}>
              <Plus size={16} />
              Add Section
            </Button>
          </div>
          {sections.length === 0 ? (
            <p className="text-sm text-muted">No sections yet.</p>
          ) : (
            <div className="space-y-6">
              {sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  classroomId={classroomId}
                  onUpdate={() => void load()}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'subjects' && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-slate">Subjects</h2>
              <p className="text-xs text-muted">Shared across all sections</p>
            </div>
            <SubjectQuickAdd classroomId={classroomId} onDone={() => void load()} />
          </div>
          <DataTable columns={subjectCols} rows={subjects} rowKey={(r) => r.id} emptyMessage="No subjects" />
        </section>
      )}

      <Modal
        open={addSectionOpen}
        title="Add section"
        onClose={() => setAddSectionOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setAddSectionOpen(false)}>Cancel</Button>
            <Button onClick={() => void addSection()}>Add</Button>
          </>
        }
      >
        <Input
          label="Section label"
          placeholder="e.g. C"
          value={newSectionLabel}
          onChange={(e) => setNewSectionLabel(e.target.value)}
          required
        />
      </Modal>
    </div>
  )
}

function SectionCard({
  section,
  classroomId,
  onUpdate,
}: {
  section: Section
  classroomId: string
  onUpdate: () => void
}) {
  const { show } = useToast()
  const [teachers, setTeachers] = useState<SectionTeacher[]>([])
  const [students, setStudents] = useState<EnrollmentRow[]>([])
  const [allTeachers, setAllTeachers] = useState<User[]>([])
  const [allStudents, setAllStudents] = useState<User[]>([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [pickTeacher, setPickTeacher] = useState('')
  const [pickStudent, setPickStudent] = useState('')

  const loadSection = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([
        api.get<SectionTeacher[]>(`/api/v1/sections/${section.id}/teachers`),
        api.get<EnrollmentRow[]>(`/api/v1/sections/${section.id}/students`),
      ])
      setTeachers(t.data)
      setStudents(s.data)
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }, [section.id, show])

  useEffect(() => {
    void loadSection()
  }, [loadSection])

  async function assignTeacher() {
    if (!pickTeacher) return
    try {
      await api.post(`/api/v1/sections/${section.id}/teachers`, { teacher_id: pickTeacher })
      show('Teacher assigned')
      setAssignOpen(false)
      setPickTeacher('')
      void loadSection()
      onUpdate()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  async function removeTeacher(tid: string) {
    try {
      await api.delete(`/api/v1/sections/${section.id}/teachers/${tid}`)
      show('Teacher removed')
      void loadSection()
      onUpdate()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  async function enroll() {
    if (!pickStudent) return
    try {
      await api.post(`/api/v1/sections/${section.id}/students`, { student_id: pickStudent })
      show('Student enrolled')
      setEnrollOpen(false)
      setPickStudent('')
      void loadSection()
      onUpdate()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  async function unenroll(sid: string) {
    try {
      await api.delete(`/api/v1/sections/${section.id}/students/${sid}`)
      show('Student removed')
      void loadSection()
      onUpdate()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-base font-semibold text-brand-slate">Section {section.label}</h3>

      {/* Teachers */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-muted">Teachers ({teachers.length})</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              setAssignOpen(true)
              try {
                const { data } = await api.get<User[]>('/api/v1/admin/users?role=teacher')
                setAllTeachers(data)
              } catch { /* ignore */ }
            }}
          >
            <Plus size={14} /> Assign
          </Button>
        </div>
        {teachers.length === 0 ? (
          <p className="text-xs text-muted">No teachers assigned</p>
        ) : (
          <ul className="space-y-1">
            {teachers.map((t) => (
              <li key={t.teacher_id} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-50">
                <span>{t.display_name ?? t.email ?? t.teacher_id}</span>
                <button className="text-red-400 hover:text-red-600" onClick={() => void removeTeacher(t.teacher_id)}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Students */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-muted">Students ({students.length})</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              setEnrollOpen(true)
              try {
                const { data } = await api.get<User[]>('/api/v1/admin/users?role=student')
                setAllStudents(data)
              } catch { /* ignore */ }
            }}
          >
            <Plus size={14} /> Enroll
          </Button>
        </div>
        {students.length === 0 ? (
          <p className="text-xs text-muted">No students enrolled</p>
        ) : (
          <ul className="space-y-1">
            {students.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-50">
                <span>{s.student_display_name ?? s.student_email ?? s.student_id}</span>
                <button className="text-red-400 hover:text-red-600" onClick={() => void unenroll(s.student_id)}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Assign teacher modal */}
      <Modal
        open={assignOpen}
        title={`Assign teacher to Section ${section.label}`}
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

      {/* Enroll student modal */}
      <Modal
        open={enrollOpen}
        title={`Enroll student in Section ${section.label}`}
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
