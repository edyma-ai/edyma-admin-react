import { useId, useState, type FormEvent } from 'react'
import { Wand2 } from 'lucide-react'
import { useCreateUser } from '@/api/queries/users'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { generatePassword } from '@/lib/password'
import { ROLE_LABELS } from '@/lib/roles'
import { useDirtyGuard } from '@/lib/useDirtyGuard'
import { EMAIL_RE } from '@/lib/validation'
import type { UserRole } from '@/types/common'
import type { School } from '@/types/schools'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'

const SCHOOL_ROLES: UserRole[] = ['student', 'teacher', 'school_manager']
const PLATFORM_ROLES: UserRole[] = ['super_admin', 'super_sales_manager', 'super_content_manager']

export interface CreateUserModalProps {
  schools: School[]
  /** School-detail context: the new user always lands in this school. */
  lockedSchoolId?: string
  /** Restricts the offered roles (School OS people pages) — a single role hides the selector. */
  roles?: UserRole[]
  onClose: () => void
}

export function CreateUserModal({ schools, lockedSchoolId, roles, onClose }: CreateUserModalProps) {
  const toast = useToast()
  const createUser = useCreateUser()
  const formId = useId()

  const availableRoles = roles ?? (lockedSchoolId ? SCHOOL_ROLES : [...SCHOOL_ROLES, ...PLATFORM_ROLES])

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>(availableRoles[0] ?? 'student')
  const [schoolId, setSchoolId] = useState(lockedSchoolId ?? '')
  const [password, setPassword] = useState('')

  const roleOptions = availableRoles.map((value) => ({ value, label: ROLE_LABELS[value] }))
  const needsSchool = SCHOOL_ROLES.includes(role)
  const valid = displayName.trim().length > 0 && EMAIL_RE.test(email.trim()) && password.length >= 8 && (!needsSchool || Boolean(lockedSchoolId || schoolId))
  const dirty = Boolean(displayName.trim() || email.trim() || password)
  const closeGuard = useDirtyGuard(dirty, onClose)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    try {
      await createUser.mutateAsync({
        email: email.trim(),
        display_name: displayName.trim(),
        role,
        password,
        school_id: needsSchool ? (lockedSchoolId ?? schoolId) : null,
      })
      toast.show(`${displayName.trim()} created`)
      onClose()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <Modal
      open
      onClose={closeGuard.requestClose}
      title={availableRoles.length === 1 ? `New ${ROLE_LABELS[availableRoles[0]].toLowerCase()}` : 'New user'}
      description="Creates an account with a password you hand over directly."
      footer={
        <>
          <Button variant="secondary" onClick={closeGuard.requestClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!valid} loading={createUser.isPending}>
            Create user
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label="Display name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Asha Rao" />
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="asha@school.in" />
        {availableRoles.length > 1 ? (
          <Select label="Role" required value={role} onChange={(e) => setRole(e.target.value as UserRole)} options={roleOptions} />
        ) : null}
        {needsSchool && !lockedSchoolId ? (
          <Select
            label="School"
            required
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            placeholder="Pick a school"
            options={schools.map((school) => ({ value: school.id, label: school.name }))}
          />
        ) : null}
        <div className="flex items-start gap-2">
          <Input
            label="Password"
            required
            mono
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Min 8 characters. Share it over a trusted channel"
            className="flex-1"
          />
          <Button variant="secondary" className="mt-[26px]" icon={<Wand2 className="h-4 w-4" />} onClick={() => setPassword(generatePassword())}>
            Generate
          </Button>
        </div>
      </form>

      {closeGuard.confirming ? (
        <ConfirmModal
          title="Discard this user?"
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
