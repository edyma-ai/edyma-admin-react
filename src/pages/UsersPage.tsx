import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'react-feather'
import { api } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/useToast'
import { useAuth } from '@/auth/useAuth'
import type { Classroom, School, Section, User, UserRole, UserUsageStats } from '@/types/models'
import { apiErrorMessage } from '@/lib/apiError'

type UserRow = User & Record<string, unknown>

const roleOptions = (showAll: boolean): { value: string; label: string }[] => {
  const base = [
    { value: 'teacher', label: 'Teacher' },
    { value: 'student', label: 'Student' },
  ]
  if (showAll) {
    return [
      { value: 'school_manager', label: 'School manager' },
      { value: 'super_sales_manager', label: 'Super sales manager' },
      { value: 'super_content_manager', label: 'Super content manager' },
      ...base,
      { value: 'super_admin', label: 'Super admin' },
    ]
  }
  return base
}

const statusOptions = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export function UsersPage() {
  const { user, school } = useAuth()
  const { show } = useToast()
  const isSuper = user?.role === 'super_admin'
  const isSales = user?.role === 'super_sales_manager'
  const canWrite = isSuper || user?.role === 'school_manager'
  const hasPlatformView = isSuper || isSales
  const [rows, setRows] = useState<UserRow[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [invite, setInvite] = useState({
    email: '',
    password: '',
    display_name: '',
    role: 'teacher' as string,
    school_id: '',
    classroom_id: '',
    section_id: '',
  })
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [inviteSections, setInviteSections] = useState<Section[]>([])
  const [editForm, setEditForm] = useState({
    display_name: '',
    account_status: 'active',
    role: 'teacher' as string,
  })
  const [usageOpen, setUsageOpen] = useState(false)
  const [usageStats, setUsageStats] = useState<UserUsageStats | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)

  const schoolNameMap = new Map(schools.map((s) => [s.id, s.name]))

  const loadSchools = useCallback(async () => {
    if (!hasPlatformView) return
    try {
      const { data } = await api.get<School[]>('/api/v1/admin/schools')
      setSchools(data)
    } catch {
      /* ignore */
    }
  }, [hasPlatformView])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter) params.set('role', roleFilter)
      if (statusFilter) params.set('account_status', statusFilter)
      if (hasPlatformView && schoolFilter) params.set('school_id', schoolFilter)
      if (appliedSearch.trim()) params.set('search', appliedSearch.trim())
      if (isSuper) params.set('include_usage', 'true')
      const { data } = await api.get<UserRow[]>(`/api/v1/admin/users?${params.toString()}`)
      setRows(data)
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [hasPlatformView, isSuper, roleFilter, statusFilter, schoolFilter, appliedSearch, show])

  useEffect(() => {
    void loadSchools()
  }, [loadSchools])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  async function openInvite() {
    setInvite({
      email: '',
      password: '',
      display_name: '',
      role: 'teacher',
      school_id: hasPlatformView ? '' : school?.id ?? '',
      classroom_id: '',
      section_id: '',
    })
    setInviteSections([])
    try {
      const { data } = await api.get<Classroom[]>('/api/v1/classrooms')
      setClassrooms(data)
    } catch { /* ignore */ }
    setInviteOpen(true)
  }

  async function submitInvite() {
    try {
      const { data: newUser } = await api.post<User>('/api/v1/admin/users', {
        email: invite.email,
        password: invite.password,
        display_name: invite.display_name,
        role: invite.role,
        school_id: invite.school_id || null,
      })
      if (invite.role === 'student' && invite.section_id && newUser?.id) {
        try {
          await api.post(`/api/v1/sections/${invite.section_id}/students`, { student_id: newUser.id })
        } catch (e) {
          show(`User created but enrollment failed: ${apiErrorMessage(e)}`, 'error')
        }
      }
      show('User invited')
      setInviteOpen(false)
      void loadUsers()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  function openEdit(row: UserRow) {
    setEditing(row)
    setEditForm({
      display_name: row.display_name,
      account_status: row.account_status,
      role: row.role,
    })
    setEditOpen(true)
  }

  async function submitEdit() {
    if (!editing) return
    try {
      const body: Record<string, string> = {
        display_name: editForm.display_name,
        account_status: editForm.account_status,
      }
      if (isSuper) body.role = editForm.role
      await api.patch(`/api/v1/admin/users/${editing.id}`, body)
      show('User updated')
      setEditOpen(false)
      void loadUsers()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  async function openUsage(row: UserRow) {
    setUsageOpen(true)
    setUsageStats(null)
    setUsageLoading(true)
    try {
      const { data } = await api.get<UserUsageStats>(`/api/v1/admin/users/${row.id}/usage`)
      setUsageStats(data)
    } catch (e) {
      show(apiErrorMessage(e), 'error')
      setUsageOpen(false)
    } finally {
      setUsageLoading(false)
    }
  }

  const columns: Column<UserRow>[] = [
    { key: 'display_name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (r) => <Badge variant="accent">{r.role.replace('_', ' ')}</Badge>,
    },
    {
      key: 'account_status',
      header: 'Status',
      sortable: true,
      render: (r) => (
        <Badge variant={r.account_status === 'active' ? 'success' : 'neutral'}>{r.account_status}</Badge>
      ),
    },
    {
      key: 'school_id',
      header: 'School',
      sortable: true,
      sortValue: (r) => (r.school_id ? schoolNameMap.get(r.school_id) ?? '' : ''),
      render: (r) => {
        if (!r.school_id) return '—'
        const name = schoolNameMap.get(r.school_id)
        return name ? <span className="text-sm">{name}</span> : <span className="font-mono text-xs text-muted">{r.school_id.slice(0, 8)}…</span>
      },
    },
    ...(isSuper ? [{
      key: 'total_credits',
      header: 'Usage',
      sortable: true,
      sortValue: (r: UserRow) => (r as Record<string, unknown>).total_credits as number ?? 0,
      render: (r: UserRow) => {
        const credits = (r as Record<string, unknown>).total_credits as number | undefined
        const requests = (r as Record<string, unknown>).total_requests as number | undefined
        if (!credits && !requests) return <span className="text-xs text-muted">—</span>
        return (
          <span className="text-xs">
            <span className="font-medium text-brand-slate">{(credits ?? 0).toFixed(1)}</span>
            <span className="text-muted"> cr · {requests ?? 0} req</span>
          </span>
        )
      },
    }] : []),
    ...(canWrite ? [{
      key: 'act',
      header: '',
      render: (r: UserRow) => (
        <Button variant="outline" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEdit(r) }}>
          Edit
        </Button>
      ),
    }] : []),
  ]

  return (
    <div>
      <PageHeader
        title="Users"
        description={canWrite ? 'Invite and manage staff and students' : 'View staff and students'}
        actions={
          canWrite ? (
            <Button onClick={openInvite}>
              <Plus size={18} />
              Invite user
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="max-w-[160px]"
          options={[{ value: '', label: 'Any role' }, ...roleOptions(hasPlatformView)]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        />
        <Select
          className="max-w-[160px]"
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        {hasPlatformView ? (
          <Select
            className="max-w-[200px]"
            options={[
              { value: '', label: 'All schools' },
              ...schools.map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
          />
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setAppliedSearch(search.trim())
          }}
        >
          Apply filters
        </Button>
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={loading} onRowClick={hasPlatformView ? (r) => openUsage(r) : undefined} />

      <Modal
        open={inviteOpen}
        title="Invite user"
        onClose={() => setInviteOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={() => void submitInvite()}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Email" type="email" value={invite.email} onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))} required />
          <Input label="Temporary password" type="password" value={invite.password} onChange={(e) => setInvite((i) => ({ ...i, password: e.target.value }))} required />
          <Input label="Display name" value={invite.display_name} onChange={(e) => setInvite((i) => ({ ...i, display_name: e.target.value }))} required />
          <Select
            label="Role"
            options={roleOptions(hasPlatformView)}
            value={invite.role}
            onChange={(e) => setInvite((i) => ({ ...i, role: e.target.value }))}
          />
          {isSuper ? (
            <Select
              label="School"
              placeholder="Select school"
              options={schools.map((s) => ({ value: s.id, label: s.name }))}
              value={invite.school_id}
              onChange={(e) => setInvite((i) => ({ ...i, school_id: e.target.value }))}
            />
          ) : null}
          {invite.role === 'student' && (
            <>
              <Select
                label="Auto-enroll in classroom (optional)"
                placeholder="Select classroom"
                options={[
                  { value: '', label: 'None' },
                  ...classrooms.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.academic_year})`,
                  })),
                ]}
                value={invite.classroom_id}
                onChange={(e) => {
                  const cid = e.target.value
                  const cl = classrooms.find((c) => c.id === cid)
                  setInvite((i) => ({ ...i, classroom_id: cid, section_id: '' }))
                  setInviteSections(cl?.sections ?? [])
                }}
              />
              {inviteSections.length > 0 && (
                <Select
                  label="Section"
                  placeholder="Select section"
                  options={inviteSections.map((s) => ({
                    value: s.id,
                    label: `Section ${s.label}`,
                  }))}
                  value={invite.section_id}
                  onChange={(e) =>
                    setInvite((i) => ({ ...i, section_id: e.target.value }))
                  }
                />
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={editOpen}
        title="Edit user"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => void submitEdit()}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Display name" value={editForm.display_name} onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))} />
          <Select
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            value={editForm.account_status}
            onChange={(e) => setEditForm((f) => ({ ...f, account_status: e.target.value }))}
          />
          {isSuper ? (
            <Select
              label="Role"
              options={roleOptions(true)}
              value={editForm.role}
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            />
          ) : null}
        </div>
      </Modal>

      <Modal
        open={usageOpen}
        title={usageStats ? `Usage — ${usageStats.user.display_name}` : 'User Usage'}
        onClose={() => setUsageOpen(false)}
        footer={
          <Button variant="outline" onClick={() => setUsageOpen(false)}>Close</Button>
        }
      >
        {usageLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-slate" />
          </div>
        ) : usageStats ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border-light bg-slate-50 p-3 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-brand-slate">{usageStats.user.email}</span>
                <Badge variant="accent">{usageStats.user.role.replace(/_/g, ' ')}</Badge>
              </div>
              {usageStats.user.last_login_at ? (
                <div className="mt-1 text-xs text-muted">
                  Last login: {new Date(usageStats.user.last_login_at).toLocaleString()}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Credits" value={usageStats.credits.toFixed(1)} />
              {isSuper ? <MiniStat label="Cost" value={`$${usageStats.dollar_cost.toFixed(4)}`} /> : null}
              <MiniStat label="AI Requests" value={usageStats.requests} />
              <MiniStat label="Chat Sessions" value={usageStats.chat_sessions} />
            </div>

            {usageStats.by_workflow.length > 0 ? (
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">By Workflow</div>
                <div className="space-y-1.5">
                  {usageStats.by_workflow.map((w) => (
                    <div key={w.workflow_type} className="flex items-center justify-between rounded-md border border-border-light px-3 py-1.5 text-sm">
                      <span className="capitalize text-brand-slate">{w.workflow_type.replace(/_/g, ' ')}</span>
                      <span className="text-muted">{w.credits.toFixed(2)} credits ({w.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {usageStats.daily.length > 0 ? (
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Daily usage (last {usageStats.period_days}d)</div>
                <div className="max-h-40 overflow-y-auto rounded-md border border-border-light">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b border-border-light text-muted">
                        <th className="px-3 py-1.5">Date</th>
                        <th className="px-3 py-1.5 text-right">Credits</th>
                        <th className="px-3 py-1.5 text-right">Requests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageStats.daily.map((d) => (
                        <tr key={d.date} className="border-b border-border-light/50 last:border-0">
                          <td className="px-3 py-1.5 text-brand-slate">{d.date}</td>
                          <td className="px-3 py-1.5 text-right text-muted">{d.credits.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right text-muted">{d.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-muted">No usage data in the last {usageStats.period_days} days</div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border-light bg-white p-2.5 text-center">
      <div className="text-lg font-bold text-brand-slate">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</div>
    </div>
  )
}
