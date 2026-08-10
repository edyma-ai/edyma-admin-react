import { useState, type FormEvent } from 'react'
import { useUpdateSchool } from '@/api/queries/schools'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { School } from '@/types/schools'

/** Mount with key={school.id} so the form resets when navigating between schools. */
export function SchoolProfileTab({ school, canEdit }: { school: School; canEdit: boolean }) {
  const toast = useToast()
  const updateSchool = useUpdateSchool(school.id)
  const [form, setForm] = useState({
    name: school.name,
    address: school.address ?? '',
    city: school.city ?? '',
    country: school.country ?? '',
    logo_url: school.logo_url ?? '',
    logo_url_dark: school.logo_url_dark ?? '',
  })

  function setField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Cleared optional fields save as null (the wizard's convention) rather than empty strings.
  const payload = {
    name: form.name.trim(),
    address: form.address.trim() || null,
    city: form.city.trim() || null,
    country: form.country.trim() || null,
    logo_url: form.logo_url.trim() || null,
    logo_url_dark: form.logo_url_dark.trim() || null,
  }
  const dirty =
    payload.name !== school.name ||
    payload.address !== (school.address ?? null) ||
    payload.city !== (school.city ?? null) ||
    payload.country !== (school.country ?? null) ||
    payload.logo_url !== (school.logo_url ?? null) ||
    payload.logo_url_dark !== (school.logo_url_dark ?? null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!dirty || !payload.name) return
    try {
      await updateSchool.mutateAsync(payload)
      toast.show('School profile saved')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <SectionCard
        title="Profile"
        description={canEdit ? 'Name, location and logos shown across the apps.' : 'Read-only. Only super admins can edit school profiles.'}
        actions={
          canEdit ? (
            <Button type="submit" loading={updateSchool.isPending} disabled={!dirty || !payload.name}>
              Save changes
            </Button>
          ) : undefined
        }
      >
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <Input label="Name" required value={form.name} onChange={(e) => setField('name', e.target.value)} disabled={!canEdit} className="sm:col-span-2" />
          <Input label="Address" value={form.address} onChange={(e) => setField('address', e.target.value)} disabled={!canEdit} className="sm:col-span-2" />
          <Input label="City" value={form.city} onChange={(e) => setField('city', e.target.value)} disabled={!canEdit} />
          <Input label="Country" value={form.country} onChange={(e) => setField('country', e.target.value)} disabled={!canEdit} />
          <Input
            label="Logo URL"
            mono
            value={form.logo_url}
            onChange={(e) => setField('logo_url', e.target.value)}
            disabled={!canEdit}
            hint="s3:// key or https URL, shown on light surfaces"
          />
          <Input
            label="Dark logo URL"
            mono
            value={form.logo_url_dark}
            onChange={(e) => setField('logo_url_dark', e.target.value)}
            disabled={!canEdit}
            hint="Variant for dark surfaces"
          />
        </div>
      </SectionCard>
    </form>
  )
}
