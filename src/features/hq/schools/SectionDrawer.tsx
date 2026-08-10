import { useMemo, useState, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import {
  useAssignTeacher,
  useEnrollStudent,
  useSectionStudents,
  useSectionTeachers,
  useUnassignTeacher,
  useUnenrollStudent,
} from '@/api/queries/sections'
import { useAdminUsers } from '@/api/queries/users'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { IconButton } from '@/components/ui/IconButton'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { School } from '@/types/schools'
import type { Section } from '@/types/sections'

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  )
}

interface PersonRow {
  id: string
  name: string
  email?: string | null
}

function PersonList({ people, emptyLabel, removeLabel, onRemove, removing }: { people: PersonRow[]; emptyLabel: string; removeLabel: string; onRemove: (id: string) => void; removing: boolean }) {
  if (people.length === 0) return <p className="text-[13px] text-muted">{emptyLabel}</p>
  return (
    <ul className="flex flex-col">
      {people.map((person) => (
        <li key={person.id} className="flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{person.name}</p>
            {person.email ? <p className="truncate text-xs text-muted">{person.email}</p> : null}
          </div>
          <IconButton label={`${removeLabel} ${person.name}`} size="sm" icon={<X />} disabled={removing} onClick={() => onRemove(person.id)} />
        </li>
      ))}
    </ul>
  )
}

function PickerRow({ label, value, onChange, options, onAdd, adding, addLabel }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; onAdd: () => void; adding: boolean; addLabel: string }) {
  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label={label}
        className="flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={options.length === 0 ? 'No one left to add' : label}
        options={options}
        disabled={options.length === 0}
      />
      <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={onAdd} disabled={!value} loading={adding}>
        {addLabel}
      </Button>
    </div>
  )
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  )
}

async function runWithToast(toast: ReturnType<typeof useToast>, action: () => Promise<unknown>, success: string, after?: () => void) {
  try {
    await action()
    toast.show(success)
    after?.()
  } catch (err) {
    toast.show(apiErrorMessage(err), 'error')
  }
}

export interface RosterPanelProps {
  sectionId: string
  /** Scopes the add-picker to the section's school. */
  schoolId: string
}

/** Assigned teachers of one section with an assign/unassign picker — shared by the roster drawer and the School OS section tabs. */
export function SectionTeachersPanel({ sectionId, schoolId }: RosterPanelProps) {
  const toast = useToast()
  const teachers = useSectionTeachers(sectionId)
  const schoolTeachers = useAdminUsers({ school_id: schoolId, role: 'teacher' })
  const assignTeacher = useAssignTeacher(sectionId)
  const unassignTeacher = useUnassignTeacher(sectionId)
  const [pick, setPick] = useState('')

  const availableTeachers = useMemo(() => {
    const assigned = new Set((teachers.data ?? []).map((teacher) => teacher.teacher_id))
    return (schoolTeachers.data ?? []).filter((candidate) => !assigned.has(candidate.id))
  }, [teachers.data, schoolTeachers.data])

  return (
    <div className="flex flex-col gap-3">
      {teachers.isPending ? (
        <ListSkeleton />
      ) : teachers.isError ? (
        <ErrorState message={apiErrorMessage(teachers.error)} onRetry={() => void teachers.refetch()} className="py-6" />
      ) : (
        <PersonList
          people={(teachers.data ?? []).map((teacher) => ({ id: teacher.teacher_id, name: teacher.display_name || teacher.email || teacher.teacher_id, email: teacher.email }))}
          emptyLabel="No teachers assigned yet."
          removeLabel="Unassign"
          removing={unassignTeacher.isPending}
          onRemove={(teacherId) => void runWithToast(toast, () => unassignTeacher.mutateAsync(teacherId), 'Teacher unassigned')}
        />
      )}
      <PickerRow
        label="Pick a teacher"
        value={pick}
        onChange={setPick}
        options={availableTeachers.map((teacher) => ({ value: teacher.id, label: `${teacher.display_name} (${teacher.email})` }))}
        adding={assignTeacher.isPending}
        addLabel="Assign"
        onAdd={() => void runWithToast(toast, () => assignTeacher.mutateAsync(pick), 'Teacher assigned', () => setPick(''))}
      />
    </div>
  )
}

/** Enrolled students of one section with an enroll/unenroll picker — shared by the roster drawer and the School OS section tabs. */
export function SectionStudentsPanel({ sectionId, schoolId }: RosterPanelProps) {
  const toast = useToast()
  const students = useSectionStudents(sectionId)
  const schoolStudents = useAdminUsers({ school_id: schoolId, role: 'student' })
  const enrollStudent = useEnrollStudent(sectionId)
  const unenrollStudent = useUnenrollStudent(sectionId)
  const [pick, setPick] = useState('')

  const availableStudents = useMemo(() => {
    const enrolled = new Set((students.data ?? []).map((enrollment) => enrollment.student_id))
    return (schoolStudents.data ?? []).filter((candidate) => !enrolled.has(candidate.id))
  }, [students.data, schoolStudents.data])

  return (
    <div className="flex flex-col gap-3">
      {students.isPending ? (
        <ListSkeleton />
      ) : students.isError ? (
        <ErrorState message={apiErrorMessage(students.error)} onRetry={() => void students.refetch()} className="py-6" />
      ) : (
        <PersonList
          people={(students.data ?? []).map((enrollment) => ({
            id: enrollment.student_id,
            name: enrollment.student_display_name || enrollment.student_email || enrollment.student_id,
            email: enrollment.student_email,
          }))}
          emptyLabel="No students enrolled yet."
          removeLabel="Unenroll"
          removing={unenrollStudent.isPending}
          onRemove={(studentId) => void runWithToast(toast, () => unenrollStudent.mutateAsync(studentId), 'Student unenrolled')}
        />
      )}
      <PickerRow
        label="Pick a student"
        value={pick}
        onChange={setPick}
        options={availableStudents.map((student) => ({ value: student.id, label: `${student.display_name} (${student.email})` }))}
        adding={enrollStudent.isPending}
        addLabel="Enroll"
        onAdd={() => void runWithToast(toast, () => enrollStudent.mutateAsync(pick), 'Student enrolled', () => setPick(''))}
      />
    </div>
  )
}

/** Roster management for one section: assigned teachers and enrolled students, with add/remove pickers. */
export function SectionDrawer({ school, section, onClose }: { school: Pick<School, 'id' | 'name'>; section: Section; onClose: () => void }) {
  return (
    <Drawer open onClose={onClose} title={section.label} description={`${section.class_name} · ${school.name}`}>
      <div className="flex flex-col gap-6">
        <DrawerSection title="Teachers">
          <SectionTeachersPanel sectionId={section.id} schoolId={school.id} />
        </DrawerSection>
        <DrawerSection title="Students">
          <SectionStudentsPanel sectionId={section.id} schoolId={school.id} />
        </DrawerSection>
      </div>
    </Drawer>
  )
}
