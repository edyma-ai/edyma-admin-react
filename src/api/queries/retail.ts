import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'

/** `GET /admin/retail/tenant` — 200 always; both fields null until a super admin creates the retail school. */
export interface RetailTenant {
  school_id: string | null
  school_name: string | null
}

/** The dedicated retail school (plan_type 'retail'). Retail-ops roles only: super_admin, super_sales_manager, super_content_manager. */
export function useRetailTenant(enabled = true) {
  return useQuery({
    queryKey: ['retail', 'tenant'],
    enabled,
    queryFn: async () => (await api.get<RetailTenant>('/api/v1/admin/retail/tenant')).data,
  })
}
