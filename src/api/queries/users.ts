import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { UserUsageStats } from '@/types/analytics'
import type { AdminUser, AdminUserFilters, BulkImportRequest, BulkImportResult, UserCreateBody, UserUpdateBody } from '@/types/users'

/** `enabled: false` for callers whose role can't read /admin/users (content managers). */
export function useAdminUsers(filters: AdminUserFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['users', 'list', filters],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (
        await api.get<AdminUser[]>('/api/v1/admin/users', {
          params: {
            school_id: filters.school_id || undefined,
            role: filters.role || undefined,
            search: filters.search || undefined,
            account_status: filters.account_status || undefined,
            include_usage: filters.include_usage || undefined,
          },
        })
      ).data,
  })
}

/** Plain call shared by the hook below and the onboarding wizard's stepwise executor. */
export async function postUser(body: UserCreateBody): Promise<AdminUser> {
  return (await api.post<AdminUser>('/api/v1/admin/users', body)).data
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: postUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: UserUpdateBody) => (await api.patch<AdminUser>(`/api/v1/admin/users/${userId}`, body)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/api/v1/admin/users/${userId}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

/** Usage drawer on user rows. */
export function useUserUsage(userId: string | undefined, days?: number) {
  return useQuery({
    queryKey: ['users', userId, 'usage', { days }],
    enabled: Boolean(userId),
    queryFn: async () => (await api.get<UserUsageStats>(`/api/v1/admin/users/${userId}/usage`, { params: { days } })).data,
  })
}

/** CSV import (backend lands in 9B) — dry_run validates without creating. */
export function useBulkImportUsers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: BulkImportRequest) => (await api.post<BulkImportResult>('/api/v1/admin/users/bulk', body)).data,
    onSuccess: (result) => {
      if (!result.dry_run) {
        void queryClient.invalidateQueries({ queryKey: ['users'] })
        void queryClient.invalidateQueries({ queryKey: ['sections'] })
        void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      }
    },
  })
}
