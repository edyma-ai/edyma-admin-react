import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  BroadcastBody,
  GeneratedPeriod,
  JobStartResponse,
  MediaAttachment,
  ParentBatch,
  ParentCommsJob,
  ParentContact,
  ParentContactUpdateBody,
  ParentMessage,
  ParentThread,
  PeriodReports,
  PeriodType,
  ReportsPreview,
  WhatsappTemplate,
} from '@/types/parentComms'

const BASE = '/api/v1/parent-comms'

/* ── Contacts ──────────────────────────────────────────────────────── */

export function useParentContacts(schoolId?: string) {
  return useQuery({
    queryKey: ['parent-comms', 'contacts', schoolId ?? 'all'],
    queryFn: async () => (await api.get<ParentContact[]>(`${BASE}/contacts`, { params: schoolId ? { school_id: schoolId } : undefined })).data,
  })
}

export function useUpdateParentContact(studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: ParentContactUpdateBody) => (await api.patch<ParentContact>(`${BASE}/contacts/${studentId}`, body)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['parent-comms', 'contacts'] }),
  })
}

export function useSendIntro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, resend = false }: { studentId: string; resend?: boolean }) =>
      (await api.post<JobStartResponse>(`${BASE}/contacts/${studentId}/intro`, undefined, { params: resend ? { resend: true } : undefined })).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['parent-comms'] }),
  })
}

/* ── Reports ───────────────────────────────────────────────────────── */

export function useReportsPreview(periodType: PeriodType) {
  return useQuery({
    queryKey: ['parent-comms', 'reports', 'preview', periodType],
    queryFn: async () => (await api.get<ReportsPreview>(`${BASE}/reports/preview`, { params: { period_type: periodType } })).data,
  })
}

export function useGeneratedPeriods(periodType: PeriodType) {
  return useQuery({
    queryKey: ['parent-comms', 'reports', 'periods', periodType],
    queryFn: async () => (await api.get<GeneratedPeriod[]>(`${BASE}/reports/periods`, { params: { period_type: periodType } })).data,
  })
}

export function usePeriodReports(periodType: PeriodType, periodKey: string | null) {
  return useQuery({
    queryKey: ['parent-comms', 'reports', periodType, periodKey],
    queryFn: async () => (await api.get<PeriodReports>(`${BASE}/reports/${periodType}/${periodKey}`)).data,
    enabled: Boolean(periodKey),
  })
}

export function useGenerateReports() {
  return useMutation({
    mutationFn: async (periodType: PeriodType) => (await api.post<JobStartResponse>(`${BASE}/reports/generate`, { period_type: periodType })).data,
  })
}

export function usePublishReports() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ periodType, periodKey }: { periodType: PeriodType; periodKey: string }) =>
      (await api.post<JobStartResponse>(`${BASE}/reports/publish`, { period_type: periodType, period_key: periodKey })).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['parent-comms'] }),
  })
}

/* ── Inbox ─────────────────────────────────────────────────────────── */

export function useParentThreads() {
  return useQuery({
    queryKey: ['parent-comms', 'threads'],
    queryFn: async () => (await api.get<ParentThread[]>(`${BASE}/threads`)).data,
    // Inbound messages arrive over a webhook with no push to this console,
    // so the list polls while it is open.
    refetchInterval: 30_000,
  })
}

export function useParentThread(studentId: string | null) {
  return useQuery({
    queryKey: ['parent-comms', 'thread', studentId],
    queryFn: async () => (await api.get<ParentMessage[]>(`${BASE}/threads/${studentId}`)).data,
    enabled: Boolean(studentId),
    refetchInterval: 15_000,
  })
}

export function useReply() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, bodyText }: { studentId: string; bodyText: string }) =>
      (await api.post<JobStartResponse>(`${BASE}/reply`, { student_id: studentId, body_text: bodyText })).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['parent-comms'] }),
  })
}

/* ── Notice templates and broadcast ────────────────────────────────── */

/** The approved notices an admin may send, with their parameter specs. */
export function useNoticeTemplates() {
  return useQuery({
    queryKey: ['parent-comms', 'templates'],
    queryFn: async () => (await api.get<WhatsappTemplate[]>(`${BASE}/templates`)).data,
  })
}

/** Upload an attachment to Meta once, before the notice that carries it. */
export function useUploadNoticeMedia() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return (await api.post<MediaAttachment>(`${BASE}/media`, form)).data
    },
  })
}

export function useBroadcast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: BroadcastBody) => (await api.post<JobStartResponse>(`${BASE}/broadcast`, body)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['parent-comms'] }),
  })
}

/* ── Log and batches ───────────────────────────────────────────────── */

export function useParentMessages(filters: { kind?: string; status?: string; student_id?: string }) {
  return useQuery({
    queryKey: ['parent-comms', 'messages', filters],
    queryFn: async () => (await api.get<ParentMessage[]>(`${BASE}/messages`, { params: filters })).data,
  })
}

export function useRetryMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (messageId: string) => (await api.post<JobStartResponse>(`${BASE}/messages/${messageId}/retry`)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['parent-comms'] }),
  })
}

export function useParentBatches() {
  return useQuery({
    queryKey: ['parent-comms', 'batches'],
    queryFn: async () => (await api.get<ParentBatch[]>(`${BASE}/batches`)).data,
  })
}

/**
 * Poll a running job. Stops polling once it reaches a terminal state, so an
 * open tab does not hammer the API after the work is done.
 */
export function useParentCommsJob(jobId: string | null) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['parent-comms', 'job', jobId],
    queryFn: async () => (await api.get<ParentCommsJob>(`${BASE}/jobs/${jobId}`)).data,
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'succeeded' || status === 'failed' ? false : 2000
    },
  })

  const status = query.data?.status
  const settled = status === 'succeeded' || status === 'failed' ? jobId : null

  useEffect(() => {
    if (!settled) return
    // Every trigger here does its work in a background job, so whatever it
    // touched is stale until that job ends. Refetching at trigger time reads
    // pre-run state, which is why the page used to need a manual reload to
    // show anything. Invalidating once the job settles is the only moment
    // there is something new to read. The job query itself is excluded, or
    // invalidating would refetch the thing driving this effect.
    void queryClient.invalidateQueries({
      queryKey: ['parent-comms'],
      predicate: (entry) => entry.queryKey[1] !== 'job',
    })
  }, [settled, queryClient])

  return query
}
