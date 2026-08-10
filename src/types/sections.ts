/** Sections — the only school-scoped academic object (classrooms retired in phase 7). */

export interface Section {
  id: string
  school_id: string
  class_id: string
  /** Denormalized server-side from classes_md. */
  class_name: string
  academic_year_id: string
  label: string
  created_at: number
  updated_at: number
}

/** POST /sections. */
export interface SectionCreateBody {
  class_id: string
  academic_year_id: string
  label: string
  /** super_admin only; managers always create in their own school. */
  school_id?: string | null
}

/** Row of GET /sections/{id}/teachers. */
export interface SectionTeacher {
  teacher_id: string
  display_name?: string | null
  email?: string | null
}

/** Row of GET /sections/{id}/students. */
export interface Enrollment {
  id: string
  section_id: string
  student_id: string
  student_display_name?: string | null
  student_email?: string | null
  created_at: number
}
