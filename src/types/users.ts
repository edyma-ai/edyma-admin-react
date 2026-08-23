import type { AccountStatus, Timestamped, UserRole } from '@/types/common'

/** Guest accounts come from the app's "Explore as a guest" entry and expire; activation upgrades them to members in place. */
export type AccountKind = 'guest' | 'member'

/**
 * Admin user routes (`/admin/users*`) return the serialized RAW Mongo doc
 * (password hash stripped server-side), plus usage totals when requested.
 */
export interface AdminUser extends Timestamped {
  id: string
  email: string
  display_name: string
  role: UserRole
  account_status: AccountStatus
  /** Absent on accounts that predate guest access; treat that as a member. */
  account_kind?: AccountKind | null
  school_id?: string | null
  avatar_key?: string | null
  notification_prefs?: Record<string, boolean> | null
  language?: string | null
  parent_whatsapp?: string | null
  parent_name?: string | null
  last_login_at?: number | null
  is_deleted: boolean
  /** Present only with `include_usage=true` on the list route. */
  total_credits?: number
  total_requests?: number
}

/** GET /admin/users query filters. */
export interface AdminUserFilters {
  school_id?: string
  role?: UserRole
  search?: string
  account_status?: AccountStatus
  include_usage?: boolean
}

/** POST /admin/users. */
export interface UserCreateBody {
  email: string
  password: string
  display_name: string
  role: UserRole
  school_id?: string | null
}

/** PATCH /admin/users/{id}. */
export interface UserUpdateBody {
  display_name?: string
  account_status?: AccountStatus
  role?: UserRole
  school_id?: string | null
}

/* ── Bulk import (`POST /admin/users/bulk`, backend lands in 9B) ───── */

export interface BulkImportRow {
  email: string
  display_name: string
  role: 'teacher' | 'student'
  section_id?: string
}

export interface BulkImportRequest {
  school_id: string
  dry_run?: boolean
  /** 1–500 rows. */
  rows: BulkImportRow[]
}

export interface BulkImportRowResult {
  index: number
  email: string
  status: 'created' | 'valid' | 'error'
  user_id?: string
  /** Returned exactly once — stored hashed server-side. */
  generated_password?: string
  enrollment_id?: string
  error?: string
}

export interface BulkImportResult {
  total: number
  created: number
  errors: number
  dry_run: boolean
  results: BulkImportRowResult[]
}
