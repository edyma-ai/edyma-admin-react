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
import type { School, User, UserRole } from '@/types/models'
import { apiErrorMessage } from '@/lib/apiError'

type UserRow = User & Record<string, unknown>

const roleOptions = (isSuper: boolean): { value: string; label: string }[] => {
  const base = [
    { value: 'teacher', label: 'Teacher' },
    { value: 'student', label: 'Student' },
  ]
  if (isSuper) {
    return [
      { value: 'school_manager', label: 'School manager' },
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
  })
  const [editForm, setEditForm] = useState({
    display_name: '',
    account_status: 'active',
    role: 'teacher' as string,
  })

  const loadSchools = useCallback(async () => {
    if (!isSuper) return
    try {
      const { data } = await api.get<School[]>('/api/v1/admin/schools')
      setSchools(data)
    } catch {
      /* ignore */
    }
  }, [isSuper])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter) params.set('role', roleFilter)
      if (statusFilter) params.set('account_status', statusFilter)
      if (isSuper && schoolFilter) params.set('school_id', schoolFilter)
      if (appliedSearch.trim()) params.set('search', appliedSearch.trim())
      const { data } = await api.get<UserRow[]>(`/api/v1/admin/users?${params.toString()}`)
      setRows(data)
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [isSuper, roleFilter, statusFilter, schoolFilter, appliedSearch, show])

  useEffect(() => {
    void loadSchools()
  }, [loadSchools])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  function openInvite() {
    setInvite({
      email: '',
      password: '',
      display_name: '',
      role: 'teacher',
      school_id: isSuper ? '' : school?.id ?? '',
    })
    setInviteOpen(true)
  }

  async function submitInvite() {
    try {
      await api.post('/api/v1/admin/users', {
        email: invite.email,
        password: invite.password,
        display_name: invite.display_name,
        role: invite.role,
        school_id: invite.school_id || null,
      })
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

  const columns: Column<UserRow>[] = [
    { key: 'display_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (r) => <Badge variant="accent">{r.role.replace('_', ' ')}</Badge>,
    },
    {
      key: 'account_status',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.account_status === 'active' ? 'success' : 'neutral'}>{r.account_status}</Badge>
      ),
    },
    {
      key: 'school_id',
      header: 'School',
      render: (r) => (r.school_id ? <span className="font-mono text-xs text-muted">{r.school_id.slice(0, 8)}…</span> : '—'),
    },
    {
      key: 'act',
      header: '',
      render: (r) => (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(r) }}>
          Edit
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Users"
        description="Invite and manage staff and students"
        actions={
          <Button onClick={openInvite}>
            <Plus size={18} />
            Invite user
          </Button>
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
          options={[{ value: '', label: 'Any role' }, ...roleOptions(isSuper)]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        />
        <Select
          className="max-w-[160px]"
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        {isSuper ? (
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

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={loading} />

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
            options={roleOptions(isSuper)}
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
    </div>
  )
}
