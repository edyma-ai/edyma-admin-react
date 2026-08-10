/**
 * Four-pillar analytics — `/api/v1/admin/analytics/*` (built in phase 9B).
 * Shapes mirror claude-docs/09-admin-console.md §4.1 verbatim; dates are 'YYYY-MM-DD' IST.
 */

export interface AnalyticsRange {
  range_start: string
  range_end: string
}

/* ── Engagement pillar ─────────────────────────────────────────────── */

export interface DailyCount {
  date: string
  count: number
}

export interface WeeklyCount {
  week_start: string
  count: number
}

export interface ModeMixEntry {
  mode: string
  events: number
  students: number
}

export type TimeSpentSource = 'derived' | 'time_spent' | 'mixed'

export interface EngagementAnalytics extends AnalyticsRange {
  active_students: {
    total_students: number
    active_7d: number
    active_30d: number
    dau: DailyCount[]
    wau: WeeklyCount[]
  }
  mode_mix: ModeMixEntry[]
  time_spent: {
    total_minutes: number
    avg_daily_minutes_per_active_student: number
    by_mode: { mode: string; minutes: number }[]
    daily: { date: string; minutes: number }[]
    source: TimeSpentSource
  }
  streaks: {
    active_streaks: number
    avg_length: number
    /** Buckets: '1-2' · '3-6' · '7-13' · '14+'. */
    distribution: { bucket: string; count: number }[]
  }
  coins: {
    total_awarded: number
    daily: { date: string; coins: number }[]
    students_at_daily_cap_7d: number
  }
}

/* ── Outcomes pillar ───────────────────────────────────────────────── */

export type MasteryBandName = 'strong' | 'getting_there' | 'needs_work'

export interface OutcomesAnalytics extends AnalyticsRange {
  scores: {
    /** Buckets: '0-19' … '80-100' (matches credit_stats bands). */
    distribution: { range: string; count: number }[]
    trend: { date: string; avg_score: number; evaluations: number }[]
  }
  mastery: {
    distribution: { band: MasteryBandName; students: number }[]
    movement: { date: string; avg_mastery: number }[]
  }
  at_risk: {
    section_id: string
    section_label: string
    school_id: string
    school_name: string
    class_id: string
    student_count: number
    at_risk_count: number
  }[]
  chapter_hotspots: {
    chapter_id: string
    chapter_name: string
    subject_id: string
    attempts: number
    wrong_rate: number
    /** null when no completed evaluations touch the chapter's assessments. */
    avg_evaluation_score: number | null
  }[]
}

/* ── Funnel pillar (HQ only) ───────────────────────────────────────── */

export interface FunnelAnalytics extends AnalyticsRange {
  leads: {
    by_status: { new: number; contacted: number; converted: number }
    by_kind: { student: number; school: number }
    weekly: { week_start: string; created: number; converted: number }[]
    conversion_rate: number
  }
  subscriptions: {
    active: number
    by_plan: { plan_id: string; plan_name: string; count: number }[]
    activations: { date: string; count: number }[]
  }
  schools: {
    total: number
    new_in_range: number
    growth: { date: string; cumulative: number }[]
  }
  digests: {
    sent_7d: number
    last_run_at: number | null
  }
}

/* ── Platform & AI ops pillar ──────────────────────────────────────── */

export interface OpsAnalytics extends AnalyticsRange {
  ai: {
    total_credits: number
    total_dollar_cost: number
    total_requests: number
    by_workflow: { workflow_type: string; credits: number; dollar_cost: number; count: number }[]
    /** Platform-user / unattributed usage rolls up under a `school_id: null` row. */
    by_school: { school_id: string | null; school_name: string | null; credits: number; dollar_cost: number }[]
    time_series: { date: string; credits: number; dollar_cost: number; count: number }[]
  }
  support: {
    open: number
    in_progress: number
    resolved_in_range: number
    by_category: { category: string; count: number }[]
    weekly: { week_start: string; created: number }[]
  }
  notifications: {
    feed_items_in_range: number
    by_type: { type: string; count: number }[]
    devices_registered: number
  }
}

/* ── Section analytics (manager-safe insights variant) ─────────────── */

/** Direction of a student's recent evaluation scores (app/models/sections.py). */
export type StudentTrend = 'up' | 'down' | 'flat'

export interface StudentInsight {
  student_id: string
  display_name?: string | null
  avatar_key?: string | null
  average?: number | null
  /** null with fewer than 2 evaluations. */
  trend?: StudentTrend | null
  at_risk: boolean
}

export interface SectionAnalytics {
  class_average: number | null
  /** Number of completed overall evaluations behind class_average — NOT a student count. */
  evaluated_count: number
  students: StudentInsight[]
  insight_text: string
  engagement: {
    active_7d: number
    total_enrolled: number
    avg_daily_minutes_7d: number
    mode_mix: { mode: string; events: number }[]
  }
}

/* ── Existing stats endpoints (shapes verified against admin_manage.py) ── */

/** GET /admin/stats — platform shape for HQ roles, school shape for managers. */
export interface PlatformStats {
  school_count: number
  user_count: number
  section_count: number
  users_by_role: Record<string, number>
}

export interface SchoolStats {
  school_id: string | null
  teacher_count: number
  student_count: number
  section_count: number
}

export type AdminStats = PlatformStats | SchoolStats

export interface WorkflowBreakdown {
  workflow_type: string
  credits: number
  dollar_cost: number
  count: number
}

export interface CreditTimeSeriesPoint {
  date: string
  credits: number
  dollar_cost: number
  count: number
}

export interface RecentLogin {
  id: string
  display_name: string
  email: string
  role: string
  last_login_at: number
}

export interface CreditStats extends AnalyticsRange {
  total_credits: number
  total_dollar_cost: number
  total_requests: number
  by_workflow: WorkflowBreakdown[]
  time_series: CreditTimeSeriesPoint[]
  chat_sessions: {
    total: number
    unique_users: number
    avg_per_user: number
    trend: { date: string; sessions: number }[]
  }
  tlm_modules: {
    total: number
    trend: { date: string; modules: number }[]
  }
  evaluations: {
    total: number
    completed: number
    completion_rate: number
    avg_score: number
    score_distribution: { range: string; count: number }[]
  }
  engagement: {
    total_students: number
    active_7d: number
    engagement_rate: number
    total_enrollments: number
  }
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
