import type { AccountStatus, UserRole } from '@/types/common'

/** Computed plan info returned on /auth/me (mirrors app/services/plans.py). */
export interface PlanContext {
  plan: 'school' | 'individual' | 'none'
  is_retail: boolean
  plan_name?: string | null
  /** Only ever populated for individual (retail) plans. */
  price_inr?: number | null
  billing_cycle?: 'monthly' | 'annual' | null
  plan_id?: string | null
  features: string[]
}

/** Students only: current section/class placement (null until enrolled). */
export interface EnrollmentContext {
  section_id: string
  section_label: string
  class_id: string
  class_name: string
  academic_year_id: string
}

/** UserResponse — also embedded in TokenResponse.user. */
export interface AuthUser {
  id: string
  email: string
  display_name: string
  role: UserRole
  account_status: AccountStatus
  created_at: number
  avatar_key?: string | null
  school_id?: string | null
  /** Present only when set on the doc. */
  notification_prefs?: Record<string, boolean> | null
  language?: string | null
  parent_whatsapp?: string | null
  parent_name?: string | null
}

/** GET /auth/me — UserResponse plus computed plan + enrollment context. */
export interface Me extends AuthUser {
  plan_context?: PlanContext | null
  enrollment_context?: EnrollmentContext | null
}

/** POST /auth/login and /auth/refresh. */
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_at: number
  user: AuthUser
}
