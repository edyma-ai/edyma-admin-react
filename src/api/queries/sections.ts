import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Enrollment, Section, SectionCreateBody, SectionTeacher } from '@/types/sections'

/** Plain call shared by the hook below and the onboarding wizard's stepwise executor. */
export async function postSection(body: SectionCreateBody): Promise<Section> {
  return (await api.post<Section>('/api/v1/sections', body)).data
}

/** Managers see their school automatically; the `schoolId` filter is for HQ roles. `enabled: false` for roles without the sections grant (sales). */
export function useSections(schoolId?: string, enabled = true) {
  return useQuery({
    queryKey: ['sections', 'list', { schoolId }],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => (await api.get<Section[]>('/api/v1/sections', { params: { school_id: schoolId || undefined } })).data,
  })
}

export function useCreateSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: postSection,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sections'] }),
  })
}

export function useDeleteSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (sectionId: string) => {
      await api.delete(`/api/v1/sections/${sectionId}`)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sections'] }),
  })
}

export function useSectionTeachers(sectionId: string | undefined) {
  return useQuery({
    queryKey: ['sections', sectionId, 'teachers'],
    enabled: Boolean(sectionId),
    queryFn: async () => (await api.get<SectionTeacher[]>(`/api/v1/sections/${sectionId}/teachers`)).data,
  })
}

export function useAssignTeacher(sectionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (teacherId: string) => {
      await api.post(`/api/v1/sections/${sectionId}/teachers`, { teacher_id: teacherId })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sections', sectionId, 'teachers'] }),
  })
}

export function useUnassignTeacher(sectionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (teacherId: string) => {
      await api.delete(`/api/v1/sections/${sectionId}/teachers/${teacherId}`)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sections', sectionId, 'teachers'] }),
  })
}

export function useSectionStudents(sectionId: string | undefined) {
  return useQuery({
    queryKey: ['sections', sectionId, 'students'],
    enabled: Boolean(sectionId),
    queryFn: async () => (await api.get<Enrollment[]>(`/api/v1/sections/${sectionId}/students`)).data,
  })
}

export function useEnrollStudent(sectionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (studentId: string) => (await api.post<Enrollment>(`/api/v1/sections/${sectionId}/students`, { student_id: studentId })).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sections', sectionId, 'students'] }),
  })
}

export function useUnenrollStudent(sectionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (studentId: string) => {
      await api.delete(`/api/v1/sections/${sectionId}/students/${studentId}`)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sections', sectionId, 'students'] }),
  })
}
