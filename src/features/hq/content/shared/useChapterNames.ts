import { useQueries } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { ChapterListItem } from '@/types/curriculum'

const CURRICULUM_STALE_MS = 10 * 60_000

/**
 * chapter_id → name across the given subjects. Query keys match `useChapters`,
 * so the master-data cache is shared (TLMs usually cover one subject).
 */
export function useChapterNames(subjectIds: string[]): Map<string, string> {
  return useQueries({
    queries: subjectIds.map((subjectId) => ({
      queryKey: ['curriculum', 'subjects', subjectId, 'chapters'],
      staleTime: CURRICULUM_STALE_MS,
      queryFn: async () => (await api.get<ChapterListItem[]>(`/api/v1/curriculum/subjects/${subjectId}/chapters`)).data,
    })),
    combine: (results) => {
      const names = new Map<string, string>()
      for (const result of results) {
        for (const chapter of result.data ?? []) names.set(chapter.id, chapter.name)
      }
      return names
    },
  })
}
