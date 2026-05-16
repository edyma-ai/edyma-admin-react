import { useState } from 'react'
import { Bell } from 'react-feather'
import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'

const ROLES = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
]

export function NotificationsPage() {
  const { show } = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  function toggleRole(value: string) {
    setSelectedRoles((prev) => (prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]))
  }

  async function handleSend() {
    if (!title.trim()) {
      show('Please enter a notification title.', 'error')
      return
    }
    if (!body.trim()) {
      show('Please enter a notification body.', 'error')
      return
    }
    if (selectedRoles.length === 0) {
      show('Please select at least one target role.', 'error')
      return
    }

    setSending(true)
    try {
      await api.post('/api/v1/notifications/admin/send', {
        title: title.trim(),
        body: body.trim(),
        roles: selectedRoles,
      })
      show('Push notification sent successfully.', 'success')
      setTitle('')
      setBody('')
      setSelectedRoles([])
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Push Notifications"
        description="Send a push notification to teachers, students, or both."
      />

      <div className="max-w-lg rounded-xl border border-border-light bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-slate" htmlFor="notif-title">
              Title
            </label>
            <input
              id="notif-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New announcement"
              maxLength={100}
              className="rounded-lg border border-border-light px-3 py-2 text-sm text-brand-slate placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-slate" htmlFor="notif-body">
              Message
            </label>
            <textarea
              id="notif-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter the notification message…"
              maxLength={300}
              rows={4}
              className="resize-none rounded-lg border border-border-light px-3 py-2 text-sm text-brand-slate placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
            />
          </div>

          {/* Target roles */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-brand-slate">Target Roles</span>
            <div className="flex gap-4">
              {ROLES.map((role) => (
                <label
                  key={role.value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-brand-slate"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                    className="h-4 w-4 rounded border-border-light accent-brand-blue"
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>

          {/* Send button */}
          <div className="flex justify-end pt-1">
            <Button onClick={handleSend} disabled={sending}>
              <Bell size={16} strokeWidth={2} className="mr-1.5" />
              {sending ? 'Sending…' : 'Send Notification'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
