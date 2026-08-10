import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { postSchoolSubscription } from '@/api/queries/plans'
import { patchSchool, postSchool } from '@/api/queries/schools'
import { postSection } from '@/api/queries/sections'
import { postUser } from '@/api/queries/users'
import { apiErrorMessage } from '@/lib/apiError'
import { sectionKey, type WizardDraft } from '@/features/hq/onboarding/wizardModel'

export type WizardStepKey = 'school' | 'subscription' | 'sections' | 'manager'

export interface WizardRunState {
  running: boolean
  schoolId: string | null
  subscriptionDone: boolean
  /** sectionKey → created section id, so a retry never duplicates sections. */
  createdSections: Record<string, string>
  managerId: string | null
  managerLinked: boolean
  failure: { step: WizardStepKey; message: string } | null
  finished: boolean
}

const INITIAL: WizardRunState = {
  running: false,
  schoolId: null,
  subscriptionDone: false,
  createdSections: {},
  managerId: null,
  managerLinked: false,
  failure: null,
  finished: false,
}

class WizardStepError extends Error {
  readonly step: WizardStepKey

  constructor(step: WizardStepKey, reason: unknown) {
    super(apiErrorMessage(reason))
    this.step = step
  }
}

async function guard<T>(step: WizardStepKey, work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (err) {
    throw new WizardStepError(step, err)
  }
}

/**
 * Runs the review step: school → subscription → sections → manager, in order.
 * Every resource created is remembered, so retrying after a failure resumes at
 * the failed step instead of re-creating anything.
 */
export function useWizardExecutor() {
  const queryClient = useQueryClient()
  const [state, setState] = useState(INITIAL)
  // The run loop reads/writes this ref; state mirrors it for rendering.
  const progress = useRef(INITIAL)

  function commit(patch: Partial<WizardRunState>) {
    progress.current = { ...progress.current, ...patch }
    setState(progress.current)
  }

  async function run(draft: WizardDraft) {
    if (progress.current.running || progress.current.finished) return
    commit({ running: true, failure: null })

    try {
      if (!progress.current.schoolId) {
        const school = await guard('school', () =>
          postSchool({
            name: draft.school.name.trim(),
            address: draft.school.address.trim() || null,
            city: draft.school.city.trim() || null,
            country: draft.school.country.trim() || null,
            logo_url: draft.school.logoUrl.trim() || null,
            logo_url_dark: draft.school.logoUrlDark.trim() || null,
          }),
        )
        commit({ schoolId: school.id })
      }
      const schoolId = progress.current.schoolId as string

      if (draft.planId && !progress.current.subscriptionDone) {
        await guard('subscription', () => postSchoolSubscription(schoolId, { plan_id: draft.planId, status: 'active' }))
        commit({ subscriptionDone: true })
      }

      for (const section of draft.sections) {
        const key = sectionKey(section)
        if (progress.current.createdSections[key]) continue
        const created = await guard('sections', () =>
          postSection({ class_id: section.classId, academic_year_id: draft.academicYearId, label: section.label, school_id: schoolId }),
        )
        commit({ createdSections: { ...progress.current.createdSections, [key]: created.id } })
      }

      if (!progress.current.managerId) {
        const manager = await guard('manager', () =>
          postUser({
            email: draft.manager.email.trim(),
            password: draft.manager.password,
            display_name: draft.manager.displayName.trim(),
            role: 'school_manager',
            school_id: schoolId,
          }),
        )
        commit({ managerId: manager.id })
      }
      if (!progress.current.managerLinked) {
        await guard('manager', () => patchSchool(schoolId, { school_manager_id: progress.current.managerId }))
        commit({ managerLinked: true })
      }

      commit({ finished: true })
    } catch (err) {
      const failure = err instanceof WizardStepError ? { step: err.step, message: err.message } : { step: 'school' as const, message: apiErrorMessage(err) }
      commit({ failure })
    } finally {
      commit({ running: false })
      if (progress.current.schoolId) {
        void queryClient.invalidateQueries({ queryKey: ['schools'] })
        void queryClient.invalidateQueries({ queryKey: ['sections'] })
        void queryClient.invalidateQueries({ queryKey: ['users'] })
        void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      }
    }
  }

  return { state, run }
}
