import type { UserRole } from '@/types/common'

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super admin',
  school_manager: 'School manager',
  super_sales_manager: 'Sales',
  super_content_manager: 'Content',
  teacher: 'Teacher',
  student: 'Student',
}
