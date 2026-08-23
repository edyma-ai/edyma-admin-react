import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { AcademicYear, Chapter, ChapterListItem, ClassInfo, InteractiveElement, Subject } from '@/types/curriculum'

/** Master curriculum is fixture-owned and changes only on deploys — cache generously. */
const CURRICULUM_STALE_MS = 10 * 60_000

export function useClasses() {
  return useQuery({
    queryKey: ['curriculum', 'classes'],
    staleTime: CURRICULUM_STALE_MS,
    queryFn: async () => (await api.get<ClassInfo[]>('/api/v1/curriculum/classes')).data,
  })
}

export function useSubjects(classId: string | undefined) {
  return useQuery({
    queryKey: ['curriculum', 'classes', classId, 'subjects'],
    enabled: Boolean(classId),
    staleTime: CURRICULUM_STALE_MS,
    queryFn: async () => (await api.get<Subject[]>(`/api/v1/curriculum/classes/${classId}/subjects`)).data,
  })
}

export function useChapters(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['curriculum', 'subjects', subjectId, 'chapters'],
    enabled: Boolean(subjectId),
    staleTime: CURRICULUM_STALE_MS,
    queryFn: async () => (await api.get<ChapterListItem[]>(`/api/v1/curriculum/subjects/${subjectId}/chapters`)).data,
  })
}

/** The HTML body of one sim, fetched when it is about to be rendered. */
export function useInteractiveElement(elementId: string | undefined) {
  return useQuery({
    queryKey: ['curriculum', 'interactive', elementId],
    enabled: Boolean(elementId),
    staleTime: CURRICULUM_STALE_MS,
    queryFn: async () => (await api.get<InteractiveElement>(`/api/v1/curriculum/interactive/${elementId}`)).data,
  })
}

export function useChapter(chapterId: string | undefined) {
  return useQuery({
    queryKey: ['curriculum', 'chapters', chapterId],
    enabled: Boolean(chapterId),
    staleTime: CURRICULUM_STALE_MS,
    queryFn: async () => (await api.get<Chapter>(`/api/v1/curriculum/chapters/${chapterId}`)).data,
  })
}

export function useAcademicYears() {
  return useQuery({
    queryKey: ['curriculum', 'academic-years'],
    staleTime: CURRICULUM_STALE_MS,
    queryFn: async () => (await api.get<AcademicYear[]>('/api/v1/curriculum/academic-years')).data,
  })
}
