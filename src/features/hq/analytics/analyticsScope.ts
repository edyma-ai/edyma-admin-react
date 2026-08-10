import { useSearchParams } from 'react-router-dom'

/** Range presets shared by every analytics surface (backend accepts 7–180). */
export const RANGE_OPTIONS = [7, 30, 90, 180]
export const DEFAULT_RANGE = 30

export interface AnalyticsSearchScope {
  days: number
  /** Empty string = all schools (platform-wide). */
  schoolId: string
  setDays: (days: number) => void
  setSchoolId: (schoolId: string) => void
}

/**
 * URL-backed pillar controls (`?days=&school=`) — the four pillar pages share
 * the same params, so switching tabs keeps the window and school scope.
 */
export function useAnalyticsSearchScope(): AnalyticsSearchScope {
  const [searchParams, setSearchParams] = useSearchParams()

  const daysParam = Number(searchParams.get('days'))
  const days = RANGE_OPTIONS.includes(daysParam) ? daysParam : DEFAULT_RANGE
  const schoolId = searchParams.get('school') ?? ''

  function patch(updates: { days?: number; schoolId?: string }) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (updates.days !== undefined) {
          if (updates.days === DEFAULT_RANGE) next.delete('days')
          else next.set('days', String(updates.days))
        }
        if (updates.schoolId !== undefined) {
          if (updates.schoolId === '') next.delete('school')
          else next.set('school', updates.schoolId)
        }
        return next
      },
      { replace: true },
    )
  }

  return {
    days,
    schoolId,
    setDays: (value) => patch({ days: value }),
    setSchoolId: (value) => patch({ schoolId: value }),
  }
}

/** snake_case backend keys (modes, workflows, ticket categories…) → sentence labels. */
export function humanize(value: string): string {
  const text = value.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
