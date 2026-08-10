import { useId, useState, type FormEvent } from 'react'
import { useAcademicYears, useClasses } from '@/api/queries/curriculum'
import { useCreateSection } from '@/api/queries/sections'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { useDirtyGuard } from '@/lib/useDirtyGuard'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'

export interface CreateSectionModalProps {
  /** HQ context only — school managers omit it and the backend targets their own school. */
  schoolId?: string
  schoolName: string
  onClose: () => void
}

/** Class + academic year + label form — shared by the HQ school-detail Sections tab and the School OS Sections page. */
export function CreateSectionModal({ schoolId, schoolName, onClose }: CreateSectionModalProps) {
  const toast = useToast()
  const classes = useClasses()
  const years = useAcademicYears()
  const createSection = useCreateSection()
  const formId = useId()

  const [classId, setClassId] = useState('')
  const [yearId, setYearId] = useState('')
  const [label, setLabel] = useState('')

  const currentYearId = years.data?.find((year) => year.is_current)?.id ?? ''
  const effectiveYearId = yearId || currentYearId
  const valid = Boolean(classId && effectiveYearId && label.trim())
  // The year defaults to current without user input — only explicit choices count as edits.
  const closeGuard = useDirtyGuard(Boolean(classId || yearId || label.trim()), onClose)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    try {
      await createSection.mutateAsync({ class_id: classId, academic_year_id: effectiveYearId, label: label.trim(), school_id: schoolId })
      toast.show('Section created')
      onClose()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <Modal
      open
      onClose={closeGuard.requestClose}
      size="sm"
      title="New section"
      description={`Creates a section in ${schoolName}.`}
      footer={
        <>
          <Button variant="secondary" onClick={closeGuard.requestClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!valid} loading={createSection.isPending}>
            Create section
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-4">
        <Select
          label="Class"
          required
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder={classes.isPending ? 'Loading classes…' : 'Pick a class'}
          options={(classes.data ?? []).map((cls) => ({ value: cls.id, label: cls.name }))}
        />
        <Select
          label="Academic year"
          required
          value={effectiveYearId}
          onChange={(e) => setYearId(e.target.value)}
          placeholder={years.isPending ? 'Loading years…' : 'Pick a year'}
          options={(years.data ?? []).map((year) => ({ value: year.id, label: year.is_current ? `${year.label} (current)` : year.label }))}
        />
        <Input label="Label" required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 8A" />
      </form>

      {closeGuard.confirming ? (
        <ConfirmModal
          title="Discard this section?"
          description="The details you entered will be lost."
          confirmLabel="Discard"
          tone="danger"
          onConfirm={closeGuard.discard}
          onClose={closeGuard.keepEditing}
        />
      ) : null}
    </Modal>
  )
}
