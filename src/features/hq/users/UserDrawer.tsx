import { useState } from 'react'
import { useDeleteUser, useUpdateUser, useUserUsage } from '@/api/queries/users'
import { Bars } from '@/components/charts/Bars'
import { Sparkline } from '@/components/charts/Sparkline'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatNumber, formatUsd } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/roles'
import { useDirtyGuard } from '@/lib/useDirtyGuard'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'
import type { UserRole } from '@/types/common'
import type { School } from '@/types/schools'
import type { AdminUser } from '@/types/users'
import { MiniStat } from '@/features/hq/shared/MiniStat'
import { RoleBadge } from '@/features/hq/shared/RoleBadge'
import { Timestamp } from '@/features/hq/shared/Timestamp'

const SCHOOL_ROLES: UserRole[] = ['student', 'teacher', 'school_manager']
const ROLE_OPTIONS: UserRole[] = ['student', 'teacher', 'school_manager', 'super_admin', 'super_sales_manager', 'super_content_manager']

type ConfirmAction = 'deactivate' | 'delete'

function SectionHeading({ children }: { children: string }) {
  return <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{children}</h3>
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2 last:border-b-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-[13px] text-ink">{value}</span>
    </div>
  )
}

export interface UserDrawerProps {
  user: AdminUser
  schools: School[]
  /** super_admin only — the backend rejects PATCH/DELETE from other console roles. */
  canManage: boolean
  onClose: () => void
}

export function UserDrawer({ user, schools, canManage, onClose }: UserDrawerProps) {
  const toast = useToast()
  const updateUser = useUpdateUser(user.id)
  const deleteUser = useDeleteUser()
  const usage = useUserUsage(user.id)

  const [displayName, setDisplayName] = useState(user.display_name)
  const [role, setRole] = useState<UserRole>(user.role)
  const [schoolId, setSchoolId] = useState(user.school_id ?? '')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const isActive = user.account_status === 'active'
  const schoolName = user.school_id ? (schools.find((school) => school.id === user.school_id)?.name ?? user.school_id) : null
  // Platform roles carry no school — moving to one clears any stale binding, and the
  // school select can also be cleared explicitly ('school_id: null' in both cases).
  const nextSchoolId = SCHOOL_ROLES.includes(role) ? schoolId || null : null
  const schoolChanged = nextSchoolId !== (user.school_id ?? null)
  const dirty = displayName.trim() !== user.display_name || role !== user.role || schoolChanged
  const closeGuard = useDirtyGuard(dirty, onClose)

  async function saveProfile() {
    try {
      await updateUser.mutateAsync({
        ...(displayName.trim() !== user.display_name ? { display_name: displayName.trim() } : {}),
        ...(role !== user.role ? { role } : {}),
        ...(schoolChanged ? { school_id: nextSchoolId } : {}),
      })
      toast.show('User updated')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  async function toggleActive() {
    try {
      await updateUser.mutateAsync({ account_status: isActive ? 'inactive' : 'active' })
      toast.show(isActive ? 'Account deactivated' : 'Account reactivated')
      setConfirmAction(null)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  async function removeUser() {
    try {
      await deleteUser.mutateAsync(user.id)
      toast.show('User deleted')
      setConfirmAction(null)
      onClose()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <Drawer open onClose={closeGuard.requestClose} size="lg" title={user.display_name} description={user.email}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={user.role} />
          <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : 'Inactive'}</Badge>
          {schoolName ? <Badge tone="neutral">{schoolName}</Badge> : null}
        </div>

        {canManage ? (
          <section className="flex flex-col gap-3">
            <SectionHeading>Profile</SectionHeading>
            <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={ROLE_OPTIONS.map((value) => ({ value, label: ROLE_LABELS[value] }))}
            />
            {SCHOOL_ROLES.includes(role) ? (
              <Select
                label="School"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                options={[{ value: '', label: 'No school' }, ...schools.map((school) => ({ value: school.id, label: school.name }))]}
              />
            ) : null}
            <Button className="self-start" onClick={saveProfile} disabled={!dirty || !displayName.trim()} loading={updateUser.isPending && confirmAction === null}>
              Save changes
            </Button>
          </section>
        ) : null}

        <section className="flex flex-col gap-2">
          <SectionHeading>Details</SectionHeading>
          <div className="flex flex-col">
            <DetailRow label="User id" value={<span className="font-mono text-xs">{user.id}</span>} />
            <DetailRow label="Created" value={<Timestamp at={user.created_at} />} />
            <DetailRow label="Last login" value={<Timestamp at={user.last_login_at} />} />
            {user.language ? <DetailRow label="Language" value={user.language} /> : null}
            {user.parent_name ? <DetailRow label="Parent" value={user.parent_name} /> : null}
            {user.parent_whatsapp ? <DetailRow label="Parent WhatsApp" value={<span className="font-mono text-[13px]">{user.parent_whatsapp}</span>} /> : null}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading>{usage.data ? `AI usage (last ${usage.data.period_days}d)` : 'AI usage'}</SectionHeading>
          {usage.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : usage.isError ? (
            <ErrorState message={apiErrorMessage(usage.error)} onRetry={() => void usage.refetch()} className="py-6" />
          ) : usage.data ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="Credits" value={formatNumber(Math.round(usage.data.credits))} caption={formatUsd(usage.data.dollar_cost)} />
                <MiniStat label="Requests" value={formatNumber(usage.data.requests)} />
                <MiniStat label="Chat sessions" value={formatNumber(usage.data.chat_sessions)} />
              </div>
              {usage.data.by_workflow.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Credits by workflow</p>
                  <Bars
                    data={usage.data.by_workflow.map((row) => ({ ...row }))}
                    xKey="workflow_type"
                    series={[{ key: 'credits', label: 'Credits' }]}
                    height={160}
                  />
                </div>
              ) : (
                <p className="text-[13px] text-muted">No AI usage recorded in this period.</p>
              )}
              {usage.data.daily.length > 1 ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Daily credits</p>
                  <Sparkline data={usage.data.daily.map((day) => day.credits)} height={40} />
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {canManage ? (
          <section className="rounded-card border border-danger/30 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-danger">Danger zone</h3>
            <p className="mt-1 text-[13px] text-muted">Deactivation blocks sign-in but keeps data; deletion removes the account from every list.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmAction('deactivate')}>
                {isActive ? 'Deactivate account' : 'Reactivate account'}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirmAction('delete')}>
                Delete user
              </Button>
            </div>
          </section>
        ) : null}
      </div>

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        size="sm"
        title={
          confirmAction === 'delete'
            ? `Delete ${user.display_name}?`
            : isActive
              ? `Deactivate ${user.display_name}?`
              : `Reactivate ${user.display_name}?`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            {confirmAction === 'delete' ? (
              <Button variant="danger" loading={deleteUser.isPending} onClick={removeUser}>
                Delete user
              </Button>
            ) : (
              <Button loading={updateUser.isPending} onClick={toggleActive}>
                {isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
            )}
          </>
        }
      >
        <p className="text-[13px] text-muted">
          {confirmAction === 'delete'
            ? 'Soft-deletes the account. It disappears from lists and sign-in stops working immediately.'
            : isActive
              ? 'They can no longer sign in. Enrollments, scores and usage history stay intact.'
              : 'Sign-in starts working again with their existing password.'}
        </p>
      </Modal>

      {closeGuard.confirming ? (
        <ConfirmModal
          title="Discard changes?"
          description="This profile has unsaved edits. Closing throws them away."
          confirmLabel="Discard"
          tone="danger"
          onConfirm={closeGuard.discard}
          onClose={closeGuard.keepEditing}
        />
      ) : null}
    </Drawer>
  )
}
