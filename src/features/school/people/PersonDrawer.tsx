import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useSections } from '@/api/queries/sections'
import { useDeleteUser, useUpdateUser } from '@/api/queries/users'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { AdminUser } from '@/types/users'
import { RoleBadge } from '@/features/hq/shared/RoleBadge'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { useSectionRosters } from '@/features/school/sections/useSectionRosters'

type ConfirmAction = 'deactivate' | 'delete'

function SectionHeading({ children }: { children: string }) {
  return <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{children}</h3>
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2 last:border-b-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-[13px] text-ink">{value}</span>
    </div>
  )
}

/** Where the student sits: their section with a jump into its insights. */
function StudentSection({ studentId, onNavigate }: { studentId: string; onNavigate: () => void }) {
  const navigate = useNavigate()
  const sections = useSections()
  const rosters = useSectionRosters(sections.data)

  const sectionId = rosters.sectionIdByStudent.get(studentId)
  const section = sections.data?.find((entry) => entry.id === sectionId)

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>Section</SectionHeading>
      {sections.isPending || rosters.isLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : section ? (
        <div className="flex items-center justify-between gap-3 rounded-control border border-hairline px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">
              {section.class_name} · {section.label}
            </p>
            <p className="text-xs text-muted">Enrolled section</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowRight className="h-3.5 w-3.5" />}
            onClick={() => {
              onNavigate()
              navigate(`/sections/${section.id}`)
            }}
          >
            Insights
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-muted">Not enrolled yet. Enroll them from a section’s Students tab.</p>
      )}
    </section>
  )
}

/** School OS light drawer: profile edit, placement, and account controls for one teacher or student. */
export function PersonDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const toast = useToast()
  const updateUser = useUpdateUser(user.id)
  const deleteUser = useDeleteUser()

  const [displayName, setDisplayName] = useState(user.display_name)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const isActive = user.account_status === 'active'
  const dirty = displayName.trim() !== user.display_name

  async function saveProfile() {
    try {
      await updateUser.mutateAsync({ display_name: displayName.trim() })
      toast.show('Profile updated')
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
      toast.show(`${user.display_name} deleted`)
      setConfirmAction(null)
      onClose()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <Drawer open onClose={onClose} title={user.display_name} description={user.email}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={user.role} />
          <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : 'Inactive'}</Badge>
        </div>

        <section className="flex flex-col gap-3">
          <SectionHeading>Profile</SectionHeading>
          <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Button className="self-start" onClick={saveProfile} disabled={!dirty || !displayName.trim()} loading={updateUser.isPending && confirmAction === null}>
            Save changes
          </Button>
        </section>

        {user.role === 'student' ? <StudentSection studentId={user.id} onNavigate={onClose} /> : null}

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

        <section className="rounded-card border border-danger/30 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-danger">Danger zone</h3>
          <p className="mt-1 text-[13px] text-muted">Deactivation blocks sign-in but keeps data; deletion removes the account from every list.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmAction('deactivate')}>
              {isActive ? 'Deactivate account' : 'Reactivate account'}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmAction('delete')}>
              Delete account
            </Button>
          </div>
        </section>
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
                Delete account
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
              ? 'They can no longer sign in. Enrollments, scores and history stay intact.'
              : 'Sign-in starts working again with their existing password.'}
        </p>
      </Modal>
    </Drawer>
  )
}
