import { useMemo, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useSchools } from '@/api/queries/schools'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterChip, FilterChipRow } from '@/components/ui/FilterChip'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import type { UserRole } from '@/types/common'
import { RANGE_OPTIONS, useAnalyticsSearchScope } from '@/features/hq/analytics/analyticsScope'

export type AnalyticsPillar = 'engagement' | 'outcomes' | 'funnel' | 'ops'

const SA_SM: UserRole[] = ['super_admin', 'super_sales_manager']

/** Route + role registry for the four pillars — the tab bar only shows what the role can reach. */
const PILLARS: { key: AnalyticsPillar; label: string; path: string; description: string; roles: UserRole[] }[] = [
  { key: 'engagement', label: 'Engagement', path: '/analytics/engagement', description: 'Active students, time spent, streaks and coins.', roles: SA_SM },
  { key: 'outcomes', label: 'Outcomes', path: '/analytics/outcomes', description: 'Scores, mastery movement, at-risk sections and hotspots.', roles: SA_SM },
  { key: 'funnel', label: 'Funnel', path: '/analytics/funnel', description: 'Leads to activation: conversion, subscriptions and growth.', roles: SA_SM },
  { key: 'ops', label: 'Platform ops', path: '/analytics/ops', description: 'AI cost and credits, support load, notification volumes.', roles: SA_SM },
]

/** Content managers can reach /analytics/* but the pillars are business surfaces — explain instead of 403-ing. */
function AnalyticsNotice() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" description="Business metrics across engagement, outcomes, funnel and platform ops." />
      <Card padded={false}>
        <EmptyState
          icon={BarChart3}
          title="Analytics is a business surface"
          description="These dashboards are available to super admins and the sales team. Your content workspace (curriculum, assessments and TLMs) lives under Content in the sidebar."
        />
      </Card>
    </div>
  )
}

export interface AnalyticsLayoutProps {
  pillar: AnalyticsPillar
  children: ReactNode
}

/**
 * Shared frame for the four HQ analytics pillars: tab-style secondary nav plus
 * the global controls (range presets + school scope), both URL-backed so they
 * survive tab switches and reloads.
 */
export function AnalyticsLayout({ pillar, children }: AnalyticsLayoutProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { days, schoolId, setDays, setSchoolId } = useAnalyticsSearchScope()

  const role = user?.role
  const tabs = useMemo(() => PILLARS.filter((entry) => role !== undefined && entry.roles.includes(role)), [role])
  const allowed = tabs.some((entry) => entry.key === pillar)
  const schools = useSchools(undefined, allowed)
  const active = PILLARS.find((entry) => entry.key === pillar)

  if (!allowed || !active) return <AnalyticsNotice />

  const schoolOptions = [
    { value: '', label: 'All schools' },
    ...(schools.data ?? [])
      .map((school) => ({ value: school.id, label: school.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ]

  function goToPillar(value: string) {
    const target = PILLARS.find((entry) => entry.key === value)
    if (!target || target.key === pillar) return
    const query = searchParams.toString()
    navigate(query ? `${target.path}?${query}` : target.path)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Analytics"
        description={active.description}
        actions={
          <>
            <Select
              aria-label="School scope"
              className="w-52"
              options={schoolOptions}
              value={schoolId}
              onChange={(event) => setSchoolId(event.target.value)}
            />
            <FilterChipRow>
              {RANGE_OPTIONS.map((option) => (
                <FilterChip key={option} active={days === option} onClick={() => setDays(option)}>
                  {option}d
                </FilterChip>
              ))}
            </FilterChipRow>
          </>
        }
      />

      <Tabs tabs={tabs.map(({ key, label }) => ({ value: key, label }))} value={pillar} onChange={goToPillar} />

      {children}
    </div>
  )
}
