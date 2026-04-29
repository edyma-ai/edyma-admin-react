import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2 } from 'react-feather'
import { api } from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/useToast'
import type { School } from '@/types/models'
import { apiErrorMessage } from '@/lib/apiError'

type SchoolRow = School & Record<string, unknown>

export function SchoolsPage() {
  const nav = useNavigate()
  const { show } = useToast()
  const [rows, setRows] = useState<SchoolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<SchoolRow | null>(null)
  const [form, setForm] = useState({
    name: '',
    city: '',
    country: '',
    address: '',
    logo_url: '',
    school_manager_id: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<School[]>('/api/v1/admin/schools')
      setRows(data as SchoolRow[])
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [show])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', city: '', country: '', address: '', logo_url: '', school_manager_id: '' })
    setModal('create')
  }

  function openEdit(row: SchoolRow) {
    setEditing(row)
    setForm({
      name: row.name,
      city: row.city ?? '',
      country: row.country ?? '',
      address: row.address ?? '',
      logo_url: row.logo_url ?? '',
      school_manager_id: row.school_manager_id ?? '',
    })
    setModal('edit')
  }

  async function save() {
    try {
      if (modal === 'create') {
        await api.post('/api/v1/admin/schools', {
          name: form.name,
          city: form.city || null,
          country: form.country || null,
          address: form.address || null,
          logo_url: form.logo_url || null,
          school_manager_id: form.school_manager_id || null,
        })
        show('School created')
      } else if (modal === 'edit' && editing) {
        await api.patch(`/api/v1/admin/schools/${editing.id}`, {
          name: form.name,
          city: form.city || null,
          country: form.country || null,
          address: form.address || null,
          logo_url: form.logo_url || null,
          school_manager_id: form.school_manager_id || null,
        })
        show('School updated')
      }
      setModal(null)
      void load()
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    }
  }

  const columns: Column<SchoolRow>[] = [
    { key: 'name', header: 'Name' },
    { key: 'city', header: 'City', render: (r) => r.city ?? '—' },
    { key: 'country', header: 'Country', render: (r) => r.country ?? '—' },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (r) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(r) }}>
          <Edit2 size={16} />
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Schools"
        description="Create and manage partner schools"
        actions={
          <Button onClick={openCreate}>
            <Plus size={18} />
            Add school
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        onRowClick={(r) => nav(`/classrooms?school_id=${r.id}`)}
      />

      <Modal
        open={modal !== null}
        title={modal === 'create' ? 'New school' : 'Edit school'}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          <Input label="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          <Input label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          <Input
            label="Logo URL"
            value={form.logo_url}
            onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
            placeholder="https://…"
          />
          <Input
            label="School manager user ID"
            value={form.school_manager_id}
            onChange={(e) => setForm((f) => ({ ...f, school_manager_id: e.target.value }))}
            placeholder="Optional MongoDB user id"
          />
        </div>
      </Modal>
    </div>
  )
}
