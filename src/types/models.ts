export type UserRole = 'super_admin' | 'school_manager' | 'super_sales_manager' | 'super_content_manager' | 'teacher' | 'student'

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

export interface Section {
  id: string
  label: string
}

export interface Classroom {
  id: string
  name: string
  academic_year: string
  school_id?: string | null
  is_current: boolean
  sections: Section[]
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

export interface SectionTeacher {
  teacher_id: string
  display_name?: string | null
  email?: string | null
}

export interface EnrollmentRow {
  id: string
  section_id: string
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

export interface WorkflowBreakdown {
  workflow_type: string
  credits: number
  dollar_cost: number
  count: number
}

export interface TimeSeriesPoint {
  date: string
  credits: number
  dollar_cost: number
  count: number
}

export interface ChatSessionStats {
  total: number
  unique_users: number
  avg_per_user: number
  trend: { date: string; sessions: number }[]
}

export interface TlmModuleStats {
  total: number
  trend: { date: string; modules: number }[]
}

export interface EvaluationStats {
  total: number
  completed: number
  completion_rate: number
  avg_score: number
  score_distribution: { range: string; count: number }[]
}

export interface EngagementStats {
  total_students: number
  active_7d: number
  engagement_rate: number
  total_enrollments: number
}

export interface RecentLogin {
  id: string
  display_name: string
  email: string
  role: string
  last_login_at: number
}

export interface CreditStats {
  range_start: string
  range_end: string
  total_credits: number
  total_dollar_cost: number
  total_requests: number
  by_workflow: WorkflowBreakdown[]
  time_series: TimeSeriesPoint[]
  chat_sessions: ChatSessionStats
  tlm_modules: TlmModuleStats
  evaluations: EvaluationStats
  engagement: EngagementStats
  recent_logins: RecentLogin[]
}

export interface UserUsageStats {
  user: {
    id: string
    display_name: string
    email: string
    role: string
    last_login_at: number | null
    school_id: string | null
  }
  period_days: number
  credits: number
  dollar_cost: number
  requests: number
  chat_sessions: number
  by_workflow: { workflow_type: string; credits: number; count: number }[]
  daily: { date: string; credits: number; count: number }[]
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
