import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAcademicYears, useClasses } from '@/api/queries/curriculum'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { sectionKey, type SectionDraft } from '@/features/hq/onboarding/wizardModel'

export interface SectionsStepProps {
  sections: SectionDraft[]
  academicYearId: string
  onChange: (patch: { sections?: SectionDraft[]; academicYearId?: string }) => void
}

/** Step 3 — quick-add sections: pick classes, give label suffixes, build a local list (created only at review). */
export function SectionsStep({ sections, academicYearId, onChange }: SectionsStepProps) {
  const classes = useClasses()
  const years = useAcademicYears()

  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set())
  const [suffixes, setSuffixes] = useState('A')

  // Default the academic year to the current one as soon as the catalog loads.
  useEffect(() => {
    if (!academicYearId && years.data?.length) {
      onChange({ academicYearId: years.data.find((year) => year.is_current)?.id ?? years.data[0].id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when years arrive
  }, [years.data])

  const pending = useMemo<SectionDraft[]>(() => {
    const parts = suffixes
      .split(',')
      .map((part) => part.trim().toUpperCase())
      .filter(Boolean)
    const existing = new Set(sections.map(sectionKey))
    const drafts: SectionDraft[] = []
    for (const cls of classes.data ?? []) {
      if (!selectedClassIds.has(cls.id)) continue
      for (const suffix of parts) {
        const draft: SectionDraft = { classId: cls.id, className: cls.name, label: `${cls.level}${suffix}` }
        if (!existing.has(sectionKey(draft))) drafts.push(draft)
      }
    }
    return drafts
  }, [classes.data, selectedClassIds, suffixes, sections])

  function toggleClass(classId: string) {
    setSelectedClassIds((prev) => {
      const next = new Set(prev)
      if (next.has(classId)) next.delete(classId)
      else next.add(classId)
      return next
    })
  }

  function addPending() {
    if (pending.length === 0) return
    onChange({ sections: [...sections, ...pending] })
    setSelectedClassIds(new Set())
  }

  function removeSection(key: string) {
    onChange({ sections: sections.filter((section) => sectionKey(section) !== key) })
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Select
        label="Academic year"
        className="max-w-xs"
        value={academicYearId}
        onChange={(e) => onChange({ academicYearId: e.target.value })}
        placeholder={years.isPending ? 'Loading years…' : 'Pick a year'}
        options={(years.data ?? []).map((year) => ({ value: year.id, label: year.is_current ? `${year.label} (current)` : year.label }))}
      />

      <div>
        <p className="text-[13px] font-semibold text-ink">Classes</p>
        <p className="text-xs text-muted">Pick every class the school runs. Sections are stamped out per class below.</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {(classes.data ?? []).map((cls) => (
            <Checkbox key={cls.id} label={cls.name} checked={selectedClassIds.has(cls.id)} onChange={() => toggleClass(cls.id)} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Section labels"
          value={suffixes}
          onChange={(e) => setSuffixes(e.target.value)}
          hint="Comma-separated suffixes: 'A, B' makes 8A and 8B per class"
          className="max-w-xs"
        />
        <Button icon={<Plus className="h-4 w-4" />} disabled={pending.length === 0} onClick={addPending} className="mb-[26px]">
          Add {pending.length > 0 ? pending.length : ''} section{pending.length === 1 ? '' : 's'}
        </Button>
      </div>

      {sections.length > 0 ? (
        <div className="overflow-hidden rounded-card border border-hairline">
          <div className="border-b border-hairline bg-canvas/60 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
            {sections.length} section{sections.length === 1 ? '' : 's'} queued
          </div>
          <ul>
            {sections.map((section) => {
              const key = sectionKey(section)
              return (
                <li key={key} className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2 last:border-b-0">
                  <p className="text-[13px] text-ink">
                    <span className="font-semibold">{section.label}</span>
                    <span className="text-muted"> · {section.className}</span>
                  </p>
                  <IconButton label={`Remove ${section.label}`} size="sm" icon={<Trash2 />} onClick={() => removeSection(key)} />
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="text-[13px] text-muted">No sections queued yet. You can also skip this and create them later from the school's Sections tab.</p>
      )}
    </div>
  )
}
