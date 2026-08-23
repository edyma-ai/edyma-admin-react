import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { AppPlatform, AppVersionAdoption, AppVersionDoc, AppVersionUpdateBody } from '@/types/appVersions'

const BASE = '/api/v1/admin/app-versions'

/** The floor for every platform: latest, minimum, store URL. */
export function useAppVersions() {
  return useQuery({
    queryKey: ['app-versions'],
    queryFn: async () => (await api.get<AppVersionDoc[]>(BASE)).data,
  })
}

export function useUpdateAppVersion(platform: AppPlatform) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: AppVersionUpdateBody) => (await api.put<AppVersionDoc>(`${BASE}/${platform}`, body)).data,
    // The floor feeds the adoption "below minimum" counts, so both refresh.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['app-versions'] }),
  })
}

/** Who runs which version and device, per platform, within the last `days`. */
export function useAppVersionAdoption(days: number) {
  return useQuery({
    queryKey: ['app-versions', 'adoption', days],
    queryFn: async () => (await api.get<AppVersionAdoption>(`${BASE}/adoption`, { params: { days } })).data,
  })
}
