import { Input } from '@/components/ui/Input'
import type { SchoolDraft } from '@/features/hq/onboarding/wizardModel'

export interface SchoolStepProps {
  school: SchoolDraft
  onChange: (patch: Partial<SchoolDraft>) => void
}

/** Step 1 — the school's profile. Logos are optional URL/s3 keys, same as the profile tab. */
export function SchoolStep({ school, onChange }: SchoolStepProps) {
  return (
    <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <Input
        label="School name"
        required
        value={school.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Sunrise Public School"
        className="sm:col-span-2"
        autoFocus
      />
      <Input label="Address" value={school.address} onChange={(e) => onChange({ address: e.target.value })} className="sm:col-span-2" />
      <Input label="City" value={school.city} onChange={(e) => onChange({ city: e.target.value })} />
      <Input label="Country" value={school.country} onChange={(e) => onChange({ country: e.target.value })} />
      <Input
        label="Logo URL"
        mono
        value={school.logoUrl}
        onChange={(e) => onChange({ logoUrl: e.target.value })}
        hint="Optional: s3:// key or https URL for light surfaces"
      />
      <Input
        label="Dark logo URL"
        mono
        value={school.logoUrlDark}
        onChange={(e) => onChange({ logoUrlDark: e.target.value })}
        hint="Optional: variant for dark surfaces"
      />
    </div>
  )
}
