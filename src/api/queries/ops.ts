import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { SupportTicket, TicketStatus } from '@/types/support'
import type {
  AdminSendNotificationBody,
  DownloadUrlResponse,
  LlmConfigDoc,
  LlmConfigMap,
  PermissionDoc,
  PresignUploadBody,
  PresignUploadResponse,
  RoleDoc,
  RolePermissionCreateBody,
  RolePermissionDoc,
} from '@/types/ops'

/* ── Support tickets ───────────────────────────────────────────────── */

/** The whole inbox — small enough that status/category/search filtering stays client-side. */
export function useSupportTickets() {
  return useQuery({
    queryKey: ['support-tickets', 'list'],
    queryFn: async () => (await api.get<SupportTicket[]>('/api/v1/admin/support-tickets')).data,
  })
}

export function useUpdateTicketStatus(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (status: TicketStatus) =>
      (await api.patch<SupportTicket>(`/api/v1/admin/support-tickets/${ticketId}/status`, { status })).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['support-tickets'] }),
  })
}

export function useAddTicketNote(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (note: string) => (await api.post<SupportTicket>(`/api/v1/admin/support-tickets/${ticketId}/notes`, { note })).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['support-tickets'] }),
  })
}

/* ── LLM config ────────────────────────────────────────────────────── */

export function useLlmConfigs() {
  return useQuery({
    queryKey: ['llm-config'],
    queryFn: async () => (await api.get<LlmConfigMap>('/api/v1/admin/llm-config')).data,
  })
}

export function useUpdateLlmConfig(configKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<LlmConfigDoc>) => (await api.put<LlmConfigDoc>(`/api/v1/admin/llm-config/${configKey}`, body)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['llm-config'] }),
  })
}

/* ── RBAC ──────────────────────────────────────────────────────────── */

export function useRoles() {
  return useQuery({
    queryKey: ['rbac', 'roles'],
    queryFn: async () => (await api.get<RoleDoc[]>('/api/v1/admin/roles')).data,
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: ['rbac', 'permissions'],
    queryFn: async () => (await api.get<PermissionDoc[]>('/api/v1/admin/permissions')).data,
  })
}

export function useRolePermissions() {
  return useQuery({
    queryKey: ['rbac', 'role-permissions'],
    queryFn: async () => (await api.get<RolePermissionDoc[]>('/api/v1/admin/role-permissions')).data,
  })
}

const MAPPINGS_KEY = ['rbac', 'role-permissions'] as const

/** Both RBAC mutations update the matrix optimistically, roll back on error and reconcile with a refetch. */
export function useGrantRolePermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: RolePermissionCreateBody) => (await api.post<RolePermissionDoc>('/api/v1/admin/role-permissions', body)).data,
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: MAPPINGS_KEY })
      const previous = queryClient.getQueryData<RolePermissionDoc[]>(MAPPINGS_KEY)
      if (previous) {
        const now = Date.now()
        const placeholder: RolePermissionDoc = { id: `optimistic-${now}`, role_name: body.role_name, permission_name: body.permission_name, is_deleted: false, created_at: now, updated_at: now }
        queryClient.setQueryData(MAPPINGS_KEY, [...previous, placeholder])
      }
      return { previous }
    },
    onError: (_err, _body, context) => {
      if (context?.previous) queryClient.setQueryData(MAPPINGS_KEY, context.previous)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: MAPPINGS_KEY }),
  })
}

export function useRevokeRolePermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (mappingId: string) => {
      await api.delete(`/api/v1/admin/role-permissions/${mappingId}`)
    },
    onMutate: async (mappingId) => {
      await queryClient.cancelQueries({ queryKey: MAPPINGS_KEY })
      const previous = queryClient.getQueryData<RolePermissionDoc[]>(MAPPINGS_KEY)
      if (previous) queryClient.setQueryData(MAPPINGS_KEY, previous.filter((doc) => doc.id !== mappingId))
      return { previous }
    },
    onError: (_err, _mappingId, context) => {
      if (context?.previous) queryClient.setQueryData(MAPPINGS_KEY, context.previous)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: MAPPINGS_KEY }),
  })
}

/** Apply RBAC changes without a server restart. */
export function useReloadRbacCache() {
  return useMutation({
    mutationFn: async () => (await api.post<{ message: string }>('/api/v1/admin/rbac/reload')).data,
  })
}

/* ── Notifications + digests ───────────────────────────────────────── */

export function useSendNotification() {
  return useMutation({
    mutationFn: async (body: AdminSendNotificationBody) => {
      await api.post('/api/v1/notifications/admin/send', body)
    },
  })
}

/* ── Files ─────────────────────────────────────────────────────────── */

export function usePresignUpload() {
  return useMutation({
    mutationFn: async (body: PresignUploadBody) => (await api.post<PresignUploadResponse>('/api/v1/files/presign-upload', body)).data,
  })
}

export async function fetchDownloadUrl(key: string): Promise<string> {
  const { data } = await api.get<DownloadUrlResponse>('/api/v1/files/download-url', { params: { key } })
  return data.download_url
}
