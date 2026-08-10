import type { AccountStatus, UserRole } from '@/types/common'

/** Client-side filter state for the users table — '' means "any". */
export interface UserListFilters {
  search: string
  role: UserRole | ''
  status: AccountStatus | ''
  schoolId: string
  includeUsage: boolean
}

export const emptyUserFilters: UserListFilters = {
  search: '',
  role: '',
  status: '',
  schoolId: '',
  includeUsage: false,
}

const ROLE_VALUES: readonly string[] = ['super_admin', 'school_manager', 'super_sales_manager', 'super_content_manager', 'teacher', 'student']

export function parseRole(value: string | null): UserRole | '' {
  return value && ROLE_VALUES.includes(value) ? (value as UserRole) : ''
}

export function parseStatus(value: string | null): AccountStatus | '' {
  return value === 'active' || value === 'inactive' ? value : ''
}
