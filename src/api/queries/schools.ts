import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { AdminStats, CreditStats } from '@/types/analytics'
import type { School, SchoolCreateBody, SchoolProfile, SchoolUpdateBody } from '@/types/schools'

/** Plain calls shared by the hooks below and the onboarding wizard's stepwise executor. */
export async function postSchool(body: SchoolCreateBody): Promise<School> {
  return (await api.post<School>('/api/v1/admin/schools', body)).data
}

export async function patchSchool(schoolId: string, body: SchoolUpdateBody): Promise<School> {
  return (await api.patch<School>(`/api/v1/admin/schools/${schoolId}`, body)).data
}

/** `enabled: false` for callers whose role can't read /admin/schools (school managers). */
export function useSchools(search?: string, enabled = true) {
  return useQuery({
    queryKey: ['schools', 'list', { search: search || undefined }],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => (await api.get<School[]>('/api/v1/admin/schools', { params: { search: search || undefined } })).data,
  })
}

export function useCreateSchool() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: postSchool,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schools'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useUpdateSchool(schoolId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SchoolUpdateBody) => patchSchool(schoolId, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['schools'] }),
  })
}

export function useDeleteSchool() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (schoolId: string) => {
      await api.delete(`/api/v1/admin/schools/${schoolId}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schools'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

/** School OS: the manager's own school profile. */
export function useMySchool() {
  return useQuery({
    queryKey: ['schools', 'me'],
    queryFn: async () => (await api.get<SchoolProfile>('/api/v1/schools/me')).data,
  })
}

/** School OS: managers edit their own school through the public route (schools.update_own). */
export function useUpdateMySchool(schoolId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: SchoolUpdateBody) => (await api.patch<SchoolProfile>(`/api/v1/schools/${schoolId}`, body)).data,
    onSuccess: (data) => queryClient.setQueryData(['schools', 'me'], data),
  })
}

/** Headcount tiles — platform shape for HQ roles, school shape for managers. */
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get<AdminStats>('/api/v1/admin/stats')).data,
  })
}

export interface CreditStatsFilters {
  period?: 'daily' | 'weekly' | 'monthly'
  days?: number
  schoolId?: string
}

export function useCreditStats(filters: CreditStatsFilters = {}) {
  return useQuery({
    queryKey: ['credit-stats', filters],
    queryFn: async () =>
      (
        await api.get<CreditStats>('/api/v1/admin/credit-stats', {
          params: { period: filters.period, days: filters.days, school_id: filters.schoolId || undefined },
        })
      ).data,
  })
}
