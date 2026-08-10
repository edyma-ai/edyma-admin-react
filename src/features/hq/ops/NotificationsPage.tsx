import { useState } from 'react'
import { BellRing, Send, Smartphone } from 'lucide-react'
import { useOpsAnalytics } from '@/api/queries/analytics'
import { useSendNotification } from '@/api/queries/ops'
import { Card, SectionCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatNumber } from '@/lib/format'
import type { AdminSendNotificationBody } from '@/types/ops'
import { MiniStat } from '@/features/hq/shared/MiniStat'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'

type Audience = AdminSendNotificationBody['roles'][number]

const AUDIENCES: { value: Audience; label: string; description: string }[] = [
  { value: 'teacher', label: 'Teachers', description: 'Every teacher account with a registered device' },
  { value: 'student', label: 'Students', description: 'Every student account with a registered device' },
]

function audienceSummary(roles: Audience[]): string {
  return roles.map((role) => (role === 'teacher' ? 'teachers' : 'students')).join(' and ')
}

/** Compose-and-broadcast for push notifications — the one screen that reaches real devices, so it confirms hard. */
export function NotificationsPage() {
  const toast = useToast()
  const send = useSendNotification()
  const ops = useOpsAnalytics()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [roles, setRoles] = useState<Audience[]>([])
  const [confirming, setConfirming] = useState(false)

  const ready = Boolean(title.trim() && body.trim() && roles.length > 0)

  function toggleRole(role: Audience) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((value) => value !== role) : [...prev, role]))
  }

  async function broadcast() {
    try {
      await send.mutateAsync({ title: title.trim(), body: body.trim(), roles })
      toast.show(`Notification sent to all ${audienceSummary(roles)}`)
      setConfirming(false)
      setTitle('')
      setBody('')
      setRoles([])
    } catch (err) {
      setConfirming(false)
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Notifications" description="Broadcast a push notification to every teacher or student device. There is no undo, so write carefully." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_20rem]">
        <SectionCard title="Compose" description="Delivered as a push notification and added to each recipient's in-app feed.">
          <div className="flex flex-col gap-4">
            <Input label="Title" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New mock tests are live" />
            <Textarea
              label="Body"
              required
              rows={4}
              maxLength={400}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Keep it short. Long bodies get truncated on the lock screen."
            />
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-1.5 text-[13px] font-semibold text-ink">
                Audience<span className="ml-0.5 text-danger">*</span>
              </legend>
              {AUDIENCES.map((audience) => (
                <Checkbox
                  key={audience.value}
                  label={audience.label}
                  description={audience.description}
                  checked={roles.includes(audience.value)}
                  onChange={() => toggleRole(audience.value)}
                />
              ))}
            </fieldset>
            <Button className="self-end" icon={<Send className="h-4 w-4" />} disabled={!ready} onClick={() => setConfirming(true)}>
              Send broadcast
            </Button>
          </div>
        </SectionCard>

        <div className="flex flex-col gap-5">
          <SectionCard title="Preview" description="How it lands on a device.">
            <div className="rounded-card border border-hairline bg-canvas/60 p-3">
              <div className="flex items-start gap-2.5 rounded-control bg-surface p-3 shadow-card">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky text-xs font-extrabold text-white">E</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13px] font-bold text-ink">{title.trim() || 'Notification title'}</p>
                    <span className="shrink-0 text-[11px] text-muted">now</span>
                  </div>
                  <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs text-muted">{body.trim() || 'The notification body appears here.'}</p>
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
              <BellRing aria-hidden className="h-3.5 w-3.5" />
              {roles.length > 0 ? `Goes to all ${audienceSummary(roles)}.` : 'Pick at least one audience.'}
            </p>
          </SectionCard>

          <Card className="flex flex-col gap-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <Smartphone aria-hidden className="h-3.5 w-3.5" />
              Reach
            </p>
            <MiniStat label="Registered devices" value={ops.data ? formatNumber(ops.data.notifications.devices_registered) : '—'} caption="Across all roles, per platform ops" />
            <p className="text-[11px] text-muted">Broadcasts are fire-and-forget. There is no send history, so note the copy somewhere before sending.</p>
          </Card>
        </div>
      </div>

      {confirming ? (
        <ConfirmModal
          title={`Send to all ${audienceSummary(roles)}?`}
          description="This pushes to every registered device for the selected roles the moment you confirm. It cannot be recalled."
          confirmLabel="Send now"
          tone="danger"
          loading={send.isPending}
          onConfirm={() => void broadcast()}
          onClose={() => setConfirming(false)}
        >
          <div className="mt-1 rounded-control border border-hairline bg-canvas/60 px-3 py-2.5">
            <p className="text-[13px] font-bold text-ink">{title.trim()}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted">{body.trim()}</p>
          </div>
        </ConfirmModal>
      ) : null}
    </div>
  )
}
