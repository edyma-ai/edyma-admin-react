import { useMemo, useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useClasses } from '@/api/queries/curriculum'
import { useRetailTenant } from '@/api/queries/retail'
import { useSchools } from '@/api/queries/schools'
import { useSections } from '@/api/queries/sections'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Section } from '@/types/sections'

export interface TargetSectionsPickerProps {
  selected: string[]
  /** Fires with the new selection and the class it locks in (all targets share one class). */
  onChange: (sectionIds: string[], classId: string | null) => void
}

interface ClassGroup {
  classId: string
  className: string
  level: number
  sections: Section[]
}

/**
 * Role-aware target picker shared by the assessment and TLM authoring flows.
 * super_admin picks any school (retail tenant surfaced first); content
 * managers are pre-scoped to retail-tenant sections — mirroring the
 * server-side `assert_author_sections_for_subject` rule, which 403s a
 * content manager targeting anything else.
 *
 * All selected sections must share one class (the subject must match it), so
 * picking a section disables every other class's checkboxes.
 */
export function TargetSectionsPicker({ selected, onChange }: TargetSectionsPickerProps) {
  const { user: me } = useAuth()
  const isSuperAdmin = me?.role === 'super_admin'

  const schools = useSchools(undefined, isSuperAdmin)
  // The retail tenant comes from its dedicated endpoint (plan_type 'retail'
  // server-side) — never inferred from section labels.
  const tenant = useRetailTenant()
  const retailTenantId = tenant.data?.school_id

  const [schoolChoice, setSchoolChoice] = useState('')
  const schoolId = isSuperAdmin ? schoolChoice || retailTenantId || '' : undefined

  // super_admin filters server-side by ?school_id=; content managers list all
  // sections (their role sees everything) and are scoped to the retail tenant below.
  const sections = useSections(isSuperAdmin ? schoolId : undefined, isSuperAdmin ? Boolean(schoolId) : true)
  const classes = useClasses()

  const visibleSections = useMemo(() => {
    const rows = sections.data ?? []
    if (isSuperAdmin) return rows
    return retailTenantId ? rows.filter((section) => section.school_id === retailTenantId) : []
  }, [sections.data, isSuperAdmin, retailTenantId])

  const groups = useMemo<ClassGroup[]>(() => {
    const levelByClass = new Map((classes.data ?? []).map((cls) => [cls.id, cls.level]))
    const byClass = new Map<string, ClassGroup>()
    for (const section of visibleSections) {
      const group = byClass.get(section.class_id) ?? {
        classId: section.class_id,
        className: section.class_name,
        level: levelByClass.get(section.class_id) ?? 99,
        sections: [],
      }
      group.sections.push(section)
      byClass.set(section.class_id, group)
    }
    const sorted = [...byClass.values()].sort((a, b) => a.level - b.level)
    for (const group of sorted) group.sections.sort((a, b) => a.label.localeCompare(b.label))
    return sorted
  }, [visibleSections, classes.data])

  const sectionsById = useMemo(() => new Map(visibleSections.map((section) => [section.id, section])), [visibleSections])
  const lockedClassId = useMemo(() => {
    for (const id of selected) {
      const classId = sectionsById.get(id)?.class_id
      if (classId) return classId
    }
    return null
  }, [selected, sectionsById])

  function toggle(sectionId: string) {
    const next = selected.includes(sectionId) ? selected.filter((id) => id !== sectionId) : [...selected, sectionId]
    const classId = next.map((id) => sectionsById.get(id)?.class_id).find(Boolean) ?? null
    onChange(next, classId)
  }

  const schoolOptions = useMemo(() => {
    const rows = [...(schools.data ?? [])].sort((a, b) => Number(b.plan_type === 'retail') - Number(a.plan_type === 'retail') || a.name.localeCompare(b.name))
    return rows.map((school) => ({ value: school.id, label: school.plan_type === 'retail' ? `${school.name} · Retail` : school.name }))
  }, [schools.data])

  const loading = tenant.isPending || (isSuperAdmin && (schools.isPending || (Boolean(schoolId) && sections.isPending))) || (!isSuperAdmin && sections.isPending)

  return (
    <div className="flex flex-col gap-4">
      {isSuperAdmin ? (
        <Select
          label="School"
          value={schoolId ?? ''}
          onChange={(event) => {
            setSchoolChoice(event.target.value)
            onChange([], null)
          }}
          placeholder={schools.isPending ? 'Loading schools…' : 'Pick a school'}
          options={schoolOptions}
          hint="Retail cohorts live on the Edyma Academy tenant, first in the list."
        />
      ) : (
        <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          <Badge tone="warning">Retail tenant</Badge>
          Content-manager authoring targets retail cohort sections. The server enforces this scope.
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : visibleSections.length === 0 ? (
        <EmptyState
          title={isSuperAdmin ? 'No sections in this school yet' : 'No retail cohort sections yet'}
          description={
            isSuperAdmin
              ? 'Create sections from the school detail page first, then come back to target them.'
              : 'Cohort sections appear once the first student is activated in a class. Nothing to set up by hand.'
          }
          className="rounded-card border border-dashed border-hairline py-8"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            const lockedOut = lockedClassId != null && group.classId !== lockedClassId
            return (
              <fieldset key={group.classId} className="rounded-card border border-hairline p-4">
                <legend className="px-1 text-[13px] font-bold text-ink">{group.className}</legend>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.sections.map((section) => (
                    <Checkbox
                      key={section.id}
                      label={section.label}
                      checked={selected.includes(section.id)}
                      disabled={lockedOut}
                      onChange={() => toggle(section.id)}
                    />
                  ))}
                </div>
              </fieldset>
            )
          })}
          <p className="text-xs text-muted">All target sections share one class. The subject you pick must belong to it.</p>
        </div>
      )}
    </div>
  )
}
