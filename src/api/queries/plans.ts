import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Plan, SchoolEntitlements, SchoolSubscriptionBody } from '@/types/plans'

/** Plans catalog + subscription/entitlements admin (backend lands in 9B; shapes locked in the plan doc). */

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    staleTime: 5 * 60_000,
    queryFn: async () => (await api.get<Plan[]>('/api/v1/admin/plans')).data,
  })
}

export function useSchoolEntitlements(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['schools', schoolId, 'entitlements'],
    enabled: Boolean(schoolId),
    queryFn: async () => (await api.get<SchoolEntitlements>(`/api/v1/admin/schools/${schoolId}/entitlements`)).data,
  })
}

/** Plain call shared by the hook below and the onboarding wizard's stepwise executor. */
export async function postSchoolSubscription(schoolId: string, body: SchoolSubscriptionBody): Promise<unknown> {
  return (await api.post(`/api/v1/admin/schools/${schoolId}/subscription`, body)).data
}

/** Idempotent upsert of the school-scope subscription. */
export function useSetSchoolSubscription(schoolId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SchoolSubscriptionBody) => postSchoolSubscription(schoolId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schools', schoolId, 'entitlements'] })
      void queryClient.invalidateQueries({ queryKey: ['schools', 'list'] })
    },
  })
}
