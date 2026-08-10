/** Shared primitives — backend serializes ObjectIds as strings and datetimes as ms-epoch ints. */

export type UserRole = 'super_admin' | 'school_manager' | 'super_sales_manager' | 'super_content_manager' | 'teacher' | 'student'

/** Roles admitted to this console. */
export type AdminRole = Exclude<UserRole, 'teacher' | 'student'>

/** The three Edyma-team roles that see the HQ experience. */
export type HqRole = Exclude<AdminRole, 'school_manager'>

export interface Timestamped {
  created_at: number
  updated_at: number
}

export type AccountStatus = 'active' | 'inactive'
