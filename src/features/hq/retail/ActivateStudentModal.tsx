import { useId, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Wand2 } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useClasses } from '@/api/queries/curriculum'
import { useActivateRetailStudent } from '@/api/queries/leads'
import { useSchools } from '@/api/queries/schools'
import { useAdminUsers, useCreateUser } from '@/api/queries/users'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CopyField } from '@/components/ui/CopyField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatInr } from '@/lib/format'
import { generatePassword } from '@/lib/password'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useDirtyGuard } from '@/lib/useDirtyGuard'
import { EMAIL_RE } from '@/lib/validation'
import type { RetailActivationResult } from '@/types/leads'
import type { AdminUser } from '@/types/users'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'

export interface ActivationPrefill {
  /** Preselects an existing account (Retail page row action). */
  user?: AdminUser
  /** Lead-drawer prefill for a fresh account. */
  email?: string
  name?: string
  grade?: string
}

export interface ActivateStudentModalProps {
  prefill?: ActivationPrefill
  onClose: () => void
  /** Fires once on success (the leads drawer marks the lead converted). */
  onActivated?: (result: RetailActivationResult) => void
}

/** Best-effort class preselection from a lead's free-text grade ("8", "Class 8"). */
function classIdForGrade(grade: string | undefined, classes: { id: string; name: string; level: number }[]): string {
  const raw = grade?.trim().toLowerCase()
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  const byLevel = digits ? classes.find((cls) => String(cls.level) === digits) : undefined
  return byLevel?.id ?? classes.find((cls) => cls.name.toLowerCase() === raw)?.id ?? ''
}

/**
 * Activate an individual (retail) student: pick or create the account, choose a
 * class, POST /admin/retail/activations. Role-aware — creating accounts is
 * super_admin; browsing accounts needs the users grant (admin + sales);
 * content managers activate by user id.
 */
export function ActivateStudentModal({ prefill, onClose, onActivated }: ActivateStudentModalProps) {
  const toast = useToast()
  const formId = useId()
  const { user: me } = useAuth()

  const canBrowseUsers = me?.role === 'super_admin' || me?.role === 'super_sales_manager'
  const canCreateUser = me?.role === 'super_admin'

  const schools = useSchools(undefined, canBrowseUsers)
  const tenant = useMemo(() => schools.data?.find((school) => school.plan_type === 'retail'), [schools.data])
  const classes = useClasses()

  const [mode, setMode] = useState<'existing' | 'create'>(() => {
    if (prefill?.user) return 'existing'
    return canCreateUser && prefill?.email ? 'create' : 'existing'
  })

  /* Existing-account picking */
  const [search, setSearch] = useState(prefill?.email ?? prefill?.name ?? '')
  const debouncedSearch = useDebouncedValue(search, 300)
  const candidatesQuery = useAdminUsers({ role: 'student', search: debouncedSearch.trim() || undefined }, canBrowseUsers && mode === 'existing')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(prefill?.user ?? null)
  const [manualUserId, setManualUserId] = useState('')

  /* New-account fields */
  const [displayName, setDisplayName] = useState(prefill?.name ?? '')
  const [email, setEmail] = useState(prefill?.email ?? '')
  const [password, setPassword] = useState(generatePassword)

  const [classId, setClassId] = useState('')
  const effectiveClassId = classId || classIdForGrade(prefill?.grade, classes.data ?? [])

  /* Retrying after a failed activation must not re-create the account. */
  const [createdUserId, setCreatedUserId] = useState<string | null>(null)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [result, setResult] = useState<RetailActivationResult | null>(null)

  const createUser = useCreateUser()
  const activate = useActivateRetailStudent()

  // Only unattached students or students already in the retail tenant are safe targets — activation rebinds school_id.
  const candidates = useMemo(
    () => (candidatesQuery.data ?? []).filter((candidate) => !candidate.school_id || candidate.school_id === tenant?.id).slice(0, 6),
    [candidatesQuery.data, tenant?.id],
  )

  const targetUserId = mode === 'existing' ? (canBrowseUsers ? selectedUser?.id : manualUserId.trim()) : createdUserId
  const createValid = displayName.trim().length > 0 && EMAIL_RE.test(email.trim()) && password.length >= 8 && Boolean(tenant)
  const valid = Boolean(effectiveClassId) && (mode === 'create' ? Boolean(createdUserId) || createValid : Boolean(targetUserId))

  // Guard typed-in details and, above all, a created-but-unactivated account whose password was never shown.
  const dirty =
    !result &&
    (Boolean(createdUserId) || (mode === 'create' && (displayName !== (prefill?.name ?? '') || email !== (prefill?.email ?? ''))))
  const closeGuard = useDirtyGuard(dirty, onClose)

  const className = classes.data?.find((cls) => cls.id === effectiveClassId)?.name ?? effectiveClassId

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid || activate.isPending || createUser.isPending) return
    try {
      let userId = targetUserId
      if (mode === 'create' && !userId) {
        const created = await createUser.mutateAsync({
          email: email.trim(),
          display_name: displayName.trim(),
          role: 'student',
          password,
          school_id: tenant?.id ?? null,
        })
        userId = created.id
        setCreatedUserId(created.id)
        setCreatedPassword(password)
      }
      const activation = await activate.mutateAsync({ user_id: userId as string, class_id: effectiveClassId })
      setResult(activation)
      toast.show('Student activated on the Individual plan')
      onActivated?.(activation)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  if (result) {
    return (
      <Modal
        open
        onClose={onClose}
        title="Student activated"
        description={`Enrolled into the ${className} Edyma Cohort on the retail tenant.`}
        footer={<Button onClick={onClose}>Done</Button>}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-control bg-success-soft px-3 py-2.5 text-[13px] font-semibold text-success">
            <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0" />
            {result.plan_context.plan_name ?? 'Individual Plan'} is live for this student.
          </div>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Plan</dt>
              <dd className="mt-0.5 text-[13px] font-semibold text-ink">
                {result.plan_context.plan_name ?? result.plan_context.plan}
                {result.plan_context.price_inr != null ? (
                  <span className="ml-1.5 font-mono text-xs font-medium text-muted">
                    {formatInr(result.plan_context.price_inr)}
                    {result.plan_context.billing_cycle ? ` / ${result.plan_context.billing_cycle}` : ''}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Cohort section</dt>
              <dd className="mt-0.5 font-mono text-[13px] text-ink">{result.section_id}</dd>
            </div>
          </dl>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Plan features</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {result.plan_context.features.map((feature) => (
                <Badge key={feature} tone="sky" className="capitalize">
                  {feature.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
          {createdPassword ? (
            <div className="rounded-control border border-warning/40 bg-warning-soft p-3">
              <p className="text-[13px] font-semibold text-warning">This password is shown once. Copy it now.</p>
              <CopyField label="Account password" value={createdPassword} className="mt-2" />
            </div>
          ) : null}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={closeGuard.requestClose}
      title="Activate individual student"
      description="Binds the student to the retail tenant, enrolls them into the class cohort and starts the Individual plan."
      footer={
        <>
          <Button variant="secondary" onClick={closeGuard.requestClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!valid} loading={createUser.isPending || activate.isPending}>
            Activate student
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-4">
        {canCreateUser ? (
          <div className="flex items-center gap-2">
            <Button variant={mode === 'existing' ? 'primary' : 'secondary'} size="sm" onClick={() => setMode('existing')}>
              Existing account
            </Button>
            <Button variant={mode === 'create' ? 'primary' : 'secondary'} size="sm" onClick={() => setMode('create')} disabled={Boolean(createdUserId)}>
              Create account
            </Button>
          </div>
        ) : null}

        {mode === 'existing' ? (
          canBrowseUsers ? (
            <div className="flex flex-col gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search students by name or email…" />
              {selectedUser ? (
                <div className="flex items-center justify-between rounded-control border border-sky bg-sky-soft px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{selectedUser.display_name}</p>
                    <p className="truncate text-xs text-muted">{selectedUser.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                    Change
                  </Button>
                </div>
              ) : candidatesQuery.isPending && canBrowseUsers ? (
                <p className="text-[13px] text-muted">Searching…</p>
              ) : candidates.length > 0 ? (
                <ul className="overflow-hidden rounded-control border border-hairline">
                  {candidates.map((candidate) => (
                    <li key={candidate.id} className="border-b border-hairline last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(candidate)}
                        className="focus-ring flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-sky-soft/50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-ink">{candidate.display_name}</span>
                          <span className="block truncate text-xs text-muted">{candidate.email}</span>
                        </span>
                        {candidate.school_id ? <Badge tone="warning">Retail</Badge> : <Badge tone="neutral">Unattached</Badge>}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">
                  No unattached student accounts match. Only accounts without a school (or already on the retail tenant) can be activated.
                </p>
              )}
            </div>
          ) : (
            <Input
              label="Student user ID"
              mono
              required
              value={manualUserId}
              onChange={(e) => setManualUserId(e.target.value)}
              hint="Your role can activate but not browse accounts. Paste the user ID from a sales or admin teammate."
            />
          )
        ) : (
          <div className="flex flex-col gap-4">
            <Input label="Display name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Asha Rao" disabled={Boolean(createdUserId)} />
            <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="asha@gmail.com" disabled={Boolean(createdUserId)} />
            <div className="flex items-start gap-2">
              <Input
                label="Password"
                required
                mono
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint="Shown once after activation. Share it over a trusted channel"
                className="flex-1"
                disabled={Boolean(createdUserId)}
              />
              <Button
                variant="secondary"
                className="mt-[26px]"
                icon={<Wand2 className="h-4 w-4" />}
                onClick={() => setPassword(generatePassword())}
                disabled={Boolean(createdUserId)}
              >
                Generate
              </Button>
            </div>
            {createdUserId ? <p className="text-xs font-medium text-warning">Account already created. Retrying activation only.</p> : null}
            {!tenant && !schools.isPending ? (
              <p className="text-xs font-medium text-danger">No retail tenant school exists yet. Create one before adding fresh retail accounts.</p>
            ) : null}
          </div>
        )}

        <Select
          label="Class"
          required
          value={effectiveClassId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder={classes.isPending ? 'Loading classes…' : 'Pick a class'}
          options={(classes.data ?? []).map((cls) => ({ value: cls.id, label: cls.name }))}
          hint="The student joins this class's shared Edyma Cohort section."
        />
      </form>

      {closeGuard.confirming ? (
        <ConfirmModal
          title="Abandon this activation?"
          description={
            createdUserId
              ? 'The account was already created but is not activated yet, and its password has not been shown. Closing loses that password.'
              : 'The details you entered will be lost.'
          }
          confirmLabel="Close anyway"
          tone="danger"
          onConfirm={closeGuard.discard}
          onClose={closeGuard.keepEditing}
        />
      ) : null}
    </Modal>
  )
}
