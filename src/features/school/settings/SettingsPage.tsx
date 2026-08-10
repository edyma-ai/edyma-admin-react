import { useState, type FormEvent } from 'react'
import { Mail } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useMySchool, useUpdateMySchool } from '@/api/queries/schools'
import { Button } from '@/components/ui/Button'
import { Card, SectionCard } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { SchoolProfile } from '@/types/schools'
import { SchoolPlanTab } from '@/features/hq/schools/SchoolPlanTab'

const CONTACT_EMAIL = 'team.edyma@gmail.com'

/** Mount with key={school.id} so the form resets after a refetch of /schools/me. */
function SchoolProfileForm({ school }: { school: SchoolProfile }) {
  const toast = useToast()
  const updateSchool = useUpdateMySchool(school.id)
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
        title="School profile"
        description="Name, location and logos shown to your teachers and students in the apps."
        actions={
          <Button type="submit" loading={updateSchool.isPending} disabled={!dirty || !payload.name}>
            Save changes
          </Button>
        }
      >
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <Input label="Name" required value={form.name} onChange={(e) => setField('name', e.target.value)} className="sm:col-span-2" />
          <Input label="Address" value={form.address} onChange={(e) => setField('address', e.target.value)} className="sm:col-span-2" />
          <Input label="City" value={form.city} onChange={(e) => setField('city', e.target.value)} />
          <Input label="Country" value={form.country} onChange={(e) => setField('country', e.target.value)} />
          <Input
            label="Logo URL"
            mono
            value={form.logo_url}
            onChange={(e) => setField('logo_url', e.target.value)}
            hint="s3:// key or https URL, shown on light surfaces"
          />
          <Input
            label="Dark logo URL"
            mono
            value={form.logo_url_dark}
            onChange={(e) => setField('logo_url_dark', e.target.value)}
            hint="Variant for dark surfaces"
          />
        </div>
      </SectionCard>
    </form>
  )
}

function ContactCard() {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-soft text-sky">
          <Mail className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">Need changes?</p>
          <p className="mt-0.5 max-w-md text-[13px] text-muted">
            Plans, features and subscriptions are managed by the Edyma team. Write to us and we’ll sort it out.
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        icon={<Mail className="h-4 w-4" />}
        onClick={() => {
          window.location.href = `mailto:${CONTACT_EMAIL}`
        }}
      >
        Contact Edyma
      </Button>
    </Card>
  )
}

/** School OS /settings — editable profile, read-only plan & features, and the escalation card. */
export function SettingsPage() {
  const { user } = useAuth()
  const school = useMySchool()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Your school profile, plan and effective features." />

      {school.isPending ? (
        <Skeleton className="h-80 w-full rounded-card" />
      ) : school.isError ? (
        <Card padded={false}>
          <ErrorState message={apiErrorMessage(school.error)} onRetry={() => void school.refetch()} />
        </Card>
      ) : school.data ? (
        <SchoolProfileForm key={school.data.id} school={school.data} />
      ) : null}

      {user?.school_id ? <SchoolPlanTab school={{ id: user.school_id, name: school.data?.name ?? 'your school' }} /> : null}

      <ContactCard />
    </div>
  )
}
