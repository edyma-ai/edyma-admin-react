import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Tlm, TlmAddCommentBody, TlmCreateBody, TlmGenerationJob, TlmGenerationJobCreated, TlmRemoveCommentBody } from '@/types/tlm'

export function useTlms() {
  return useQuery({
    queryKey: ['tlms', 'list'],
    queryFn: async () => (await api.get<Tlm[]>('/api/v1/tlm-modules')).data,
  })
}

export function useTlm(tlmId: string | undefined) {
  return useQuery({
    queryKey: ['tlms', tlmId],
    enabled: Boolean(tlmId),
    queryFn: async () => (await api.get<Tlm>(`/api/v1/tlm-modules/${tlmId}`)).data,
  })
}

function useTlmMutation<Body>(path: (tlmId: string) => string, method: 'post' | 'delete' = 'post') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tlmId, body }: { tlmId: string; body: Body }) => {
      const response =
        method === 'post' ? await api.post<Tlm>(path(tlmId), body) : await api.delete<Tlm>(path(tlmId), { data: body })
      return response.data
    },
    onSuccess: (tlm) => {
      queryClient.setQueryData(['tlms', tlm.id], tlm)
      void queryClient.invalidateQueries({ queryKey: ['tlms', 'list'] })
    },
  })
}

/** Enqueues outline generation (create TLM + AI outline) — poll the returned job with useTlmJob. */
export function useCreateTlmOutlineJob() {
  return useMutation({
    mutationFn: async (body: TlmCreateBody) => (await api.post<TlmGenerationJobCreated>('/api/v1/tlm-modules/jobs', body)).data,
  })
}

/** Enqueues final-module generation for an existing TLM — poll the returned job with useTlmJob. */
export function useCreateTlmFinalJob() {
  return useMutation({
    mutationFn: async (tlmId: string) => (await api.post<TlmGenerationJobCreated>(`/api/v1/tlm-modules/${tlmId}/generate-final/jobs`, {})).data,
  })
}

/** Polls while the job is queued/running — mirrors usePaperExtractionJob. */
export function useTlmJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['tlm-jobs', jobId],
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const jobStatus = query.state.data?.status
      return jobStatus === 'queued' || jobStatus === 'running' ? 3000 : false
    },
    queryFn: async () => (await api.get<TlmGenerationJob>(`/api/v1/tlm-modules/jobs/${jobId}`)).data,
  })
}

export function useAddTlmComment() {
  return useTlmMutation<TlmAddCommentBody>((tlmId) => `/api/v1/tlm-modules/${tlmId}/comments`)
}

export function useRemoveTlmComment() {
  return useTlmMutation<TlmRemoveCommentBody>((tlmId) => `/api/v1/tlm-modules/${tlmId}/comments`, 'delete')
}

export function useShareTlm() {
  return useTlmMutation<Record<string, never>>((tlmId) => `/api/v1/tlm-modules/${tlmId}/share`)
}

export function useDeleteTlm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (tlmId: string) => {
      await api.delete(`/api/v1/tlm-modules/${tlmId}`)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tlms'] }),
  })
}
