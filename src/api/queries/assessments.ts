import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  Assessment,
  AssessmentCreateBody,
  AssessmentUpdateBody,
  EvaluationDoc,
  PaperExtractionCreateBody,
  PaperExtractionJob,
  SubmissionDoc,
} from '@/types/assessments'

export interface AssessmentFilters {
  subjectId?: string
  chapterId?: string
  sectionId?: string
  /** Server-side case-insensitive title search. */
  q?: string
  /** 1-based. Sending page/pageSize engages server paging over the same newest-first ordering. */
  page?: number
  pageSize?: number
}

export interface AssessmentPage {
  items: Assessment[]
  /** Total matching count from X-Total-Count; null when the server didn't page. */
  total: number | null
}

export function useAssessments(filters: AssessmentFilters = {}) {
  return useQuery({
    queryKey: ['assessments', 'list', filters],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AssessmentPage> => {
      const res = await api.get<Assessment[]>('/api/v1/assessments', {
        params: {
          subject_id: filters.subjectId || undefined,
          chapter_id: filters.chapterId || undefined,
          section_id: filters.sectionId || undefined,
          q: filters.q || undefined,
          page: filters.page,
          page_size: filters.pageSize,
        },
      })
      const rawTotal = res.headers['x-total-count']
      const total = rawTotal != null ? Number.parseInt(rawTotal, 10) : NaN
      return { items: res.data, total: Number.isNaN(total) ? null : total }
    },
  })
}

export function useAssessment(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['assessments', assessmentId],
    enabled: Boolean(assessmentId),
    queryFn: async () => (await api.get<Assessment>(`/api/v1/assessments/${assessmentId}`)).data,
  })
}

export function useCreateAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: AssessmentCreateBody) => (await api.post<Assessment>('/api/v1/assessments', body)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['assessments'] }),
  })
}

export function useUpdateAssessment(assessmentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: AssessmentUpdateBody) => (await api.put<Assessment>(`/api/v1/assessments/${assessmentId}`, body)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['assessments'] }),
  })
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (assessmentId: string) => {
      await api.delete(`/api/v1/assessments/${assessmentId}`)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['assessments'] }),
  })
}

export function useAssessmentSubmissions(assessmentId: string | undefined, sectionId?: string) {
  return useQuery({
    queryKey: ['assessments', assessmentId, 'submissions', { sectionId }],
    enabled: Boolean(assessmentId),
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await api.get<SubmissionDoc[]>(`/api/v1/assessments/${assessmentId}/submissions`, { params: { section_id: sectionId || undefined } })).data,
  })
}

export function useAssessmentEvaluations(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['assessments', assessmentId, 'evaluations'],
    enabled: Boolean(assessmentId),
    queryFn: async () => (await api.get<EvaluationDoc[]>(`/api/v1/assessments/${assessmentId}/evaluations`)).data,
  })
}

/* ── Paper extraction ──────────────────────────────────────────────── */

export function useCreatePaperExtraction() {
  return useMutation({
    mutationFn: async (body: PaperExtractionCreateBody) =>
      (await api.post<{ job_id: string; status: string }>('/api/v1/assessments/paper-extractions', body)).data,
  })
}

/** Polls while the job is queued/running. */
export function usePaperExtractionJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['paper-extractions', jobId],
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const jobStatus = query.state.data?.status
      return jobStatus === 'queued' || jobStatus === 'running' ? 2000 : false
    },
    queryFn: async () => (await api.get<PaperExtractionJob>(`/api/v1/assessments/paper-extractions/${jobId}`)).data,
  })
}
