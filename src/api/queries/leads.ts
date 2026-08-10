import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Lead, LeadStatus, LeadUpdateBody, RetailActivationBody, RetailActivationResult } from '@/types/leads'

export function useLeads(status?: LeadStatus, options: { staleTime?: number } = {}) {
  return useQuery({
    queryKey: ['leads', 'list', { status }],
    staleTime: options.staleTime,
    placeholderData: keepPreviousData,
    queryFn: async () => (await api.get<Lead[]>('/api/v1/leads', { params: { status } })).data,
  })
}

/** Advance status and/or append an operator note. */
export function useUpdateLead(leadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: LeadUpdateBody) => (await api.patch<Lead>(`/api/v1/leads/${leadId}`, body)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['leads'] }),
  })
}

/** Student-lead activation: create the user first, then post this. */
export function useActivateRetailStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: RetailActivationBody) =>
      (await api.post<RetailActivationResult>('/api/v1/admin/retail/activations', body)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['sections'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}
