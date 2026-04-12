export type UserRole = 'super_admin' | 'school_manager' | 'teacher' | 'student'

export interface User {
  id: string
  email: string
  display_name: string
  role: UserRole
  account_status: string
  created_at: number
  school_id?: string | null
}

export interface School {
  id: string
  name: string
  logo_url?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  school_manager_id?: string | null
}

export interface Classroom {
  id: string
  name: string
  academic_year: string
  section?: string | null
  teacher_id: string
  is_current: boolean
  created_at: number
  updated_at: number
}

export interface Subject {
  id: string
  name: string
  code?: string | null
  classroom_id: string
  created_at: number
  updated_at: number
}

export interface Chapter {
  id: string
  name: string
  description?: string | null
  markdown_content?: string | null
  subject_id: string
  classroom_id: string
  order: number
  created_by: string
  created_at: number
  updated_at: number
}

export interface ClassroomTeacher {
  teacher_id: string
  display_name?: string | null
  email?: string | null
  is_primary?: boolean
}

export interface EnrollmentRow {
  id: string
  classroom_id: string
  student_id: string
  student_display_name?: string | null
  student_email?: string | null
}

export interface AdminStats {
  school_count?: number
  user_count?: number
  classroom_count?: number
  users_by_role?: Record<string, number>
  teacher_count?: number
  student_count?: number
  school_id?: string | null
}

export interface AdminNote {
  note: string
  created_by: string
  created_at: number
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketCategory = 'bug' | 'feature_request' | 'feedback' | 'general'

export interface SupportTicket {
  id: string
  user_id: string
  user_email: string
  user_name: string
  user_role: string
  school_id?: string | null
  category: TicketCategory
  message: string
  attachment_key?: string | null
  status: TicketStatus
  admin_notes: AdminNote[]
  created_at: number
  updated_at: number
}
