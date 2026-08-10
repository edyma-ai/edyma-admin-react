import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAcademicYears } from '@/api/queries/curriculum'
import { useSections } from '@/api/queries/sections'
import { SectionCard } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { apiErrorMessage } from '@/lib/apiError'
import { SectionStudentsPanel, SectionTeachersPanel } from '@/features/hq/schools/SectionDrawer'
import { SectionInsightsPanel } from '@/features/school/sections/SectionInsightsPanel'

const TABS: TabItem[] = [
  { value: 'insights', label: 'Insights' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
]

/** School OS /sections/:sectionId — insights, roster and teacher assignment for one section. */
export function SectionDetailPage() {
  const { sectionId } = useParams()
  const sections = useSections()
  const years = useAcademicYears()
  const [searchParams, setSearchParams] = useSearchParams()

  const section = useMemo(() => sections.data?.find((entry) => entry.id === sectionId), [sections.data, sectionId])

  const requestedTab = searchParams.get('tab')
  const tab = TABS.some((item) => item.value === requestedTab) ? (requestedTab as string) : 'insights'

  function setTab(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === 'insights') next.delete('tab')
        else next.set('tab', value)
        return next
      },
      { replace: true },
    )
  }

  if (sections.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }
  if (sections.isError) {
    return <ErrorState message={apiErrorMessage(sections.error)} onRetry={() => void sections.refetch()} />
  }
  if (!section) {
    return <EmptyState title="Section not found" description="It may have been removed, or the link is stale." />
  }

  const yearLabel = years.data?.find((year) => year.id === section.academic_year_id)?.label ?? section.academic_year_id
  const title = `${section.class_name} · ${section.label}`

  return (
    <div className="flex flex-col gap-5">
      <PageHeader breadcrumbs={[{ label: 'Sections', to: '/sections' }, { label: title }]} title={title} description={`Academic year ${yearLabel}`} />

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'insights' ? <SectionInsightsPanel section={section} /> : null}
      {tab === 'students' ? (
        <SectionCard title="Enrolled students" description="Enroll or unenroll students of this section." className="max-w-2xl">
          <SectionStudentsPanel sectionId={section.id} schoolId={section.school_id} />
        </SectionCard>
      ) : null}
      {tab === 'teachers' ? (
        <SectionCard title="Assigned teachers" description="Teachers assigned here see the section in the mobile app." className="max-w-2xl">
          <SectionTeachersPanel sectionId={section.id} schoolId={section.school_id} />
        </SectionCard>
      ) : null}
    </div>
  )
}
