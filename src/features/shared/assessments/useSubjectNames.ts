import { useQueries } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Subject } from '@/types/curriculum'

const CURRICULUM_STALE_MS = 10 * 60_000

/**
 * subject_id → name across the given classes. Query keys match `useSubjects`,
 * so the master-data cache is shared; the class list is tiny (≤ ~12).
 */
export function useSubjectNames(classIds: string[]): Map<string, string> {
  return useQueries({
    queries: classIds.map((classId) => ({
      queryKey: ['curriculum', 'classes', classId, 'subjects'],
      staleTime: CURRICULUM_STALE_MS,
      queryFn: async () => (await api.get<Subject[]>(`/api/v1/curriculum/classes/${classId}/subjects`)).data,
    })),
    combine: (results) => {
      const names = new Map<string, string>()
      for (const result of results) {
        for (const subject of result.data ?? []) names.set(subject.id, subject.name)
      }
      return names
    },
  })
}
