import { useQueries } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Enrollment, Section } from '@/types/sections'

export interface SectionRosters {
  /** section_id → enrolled headcount; a section is absent until its roster loads. */
  enrolledCounts: Map<string, number>
  /** student_id → section_id, for the People drawer's section lookup. */
  sectionIdByStudent: Map<string, string>
  isLoading: boolean
}

/**
 * Fans out over the school's section rosters. Query keys match
 * `useSectionStudents`, so the cache is shared with the roster tabs — at
 * school scale (tens of sections) this stays cheap and mostly warm.
 */
export function useSectionRosters(sections: Section[] | undefined): SectionRosters {
  return useQueries({
    queries: (sections ?? []).map((section) => ({
      queryKey: ['sections', section.id, 'students'],
      queryFn: async () => (await api.get<Enrollment[]>(`/api/v1/sections/${section.id}/students`)).data,
    })),
    combine: (results) => {
      const enrolledCounts = new Map<string, number>()
      const sectionIdByStudent = new Map<string, string>()
      ;(sections ?? []).forEach((section, index) => {
        const roster = results[index]?.data
        if (!roster) return
        enrolledCounts.set(section.id, roster.length)
        for (const enrollment of roster) sectionIdByStudent.set(enrollment.student_id, section.id)
      })
      return { enrolledCounts, sectionIdByStudent, isLoading: results.some((result) => result.isPending) }
    },
  })
}
