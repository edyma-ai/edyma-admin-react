import { useMemo, useState } from 'react'
import { Send, UserRoundCog } from 'lucide-react'
import { useParentContacts, useSendIntro, useUpdateParentContact } from '@/api/queries/parentComms'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { ParentContact, ParentLanguage } from '@/types/parentComms'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { LanguageBadge } from '@/features/hq/parents/shared'
import { LANGUAGE_LABEL } from '@/features/hq/parents/format'

function EditContactModal({ contact, onClose }: { contact: ParentContact; onClose: () => void }) {
  const toast = useToast()
  const update = useUpdateParentContact(contact.student_id)
  const [name, setName] = useState(contact.parent_name ?? '')
  const [whatsapp, setWhatsapp] = useState(contact.parent_whatsapp ?? '')
  const [language, setLanguage] = useState<ParentLanguage>(contact.parent_language)
  const [optedOut, setOptedOut] = useState(contact.parent_opted_out)

  async function save() {
    try {
      await update.mutateAsync({ parent_name: name, parent_whatsapp: whatsapp, parent_language: language, parent_opted_out: optedOut })
      toast.show('Contact saved')
      onClose()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Parent of ${contact.student_name}`}
      description="Used for weekly and monthly reports, notices and replies."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={update.isPending} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Parent name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Kiran Rao" />
        <Input
          label="WhatsApp number"
          mono
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          placeholder="+919876543210"
          hint="International format. Clearing this stops all messages to this parent."
        />
        <Select
          label="Language"
          value={language}
          onChange={(event) => setLanguage(event.target.value as ParentLanguage)}
          options={(Object.keys(LANGUAGE_LABEL) as ParentLanguage[]).map((code) => ({ value: code, label: LANGUAGE_LABEL[code] }))}
          hint="Parents can also change this themselves by tapping a button on the introduction message."
        />
        <Switch
          checked={optedOut}
          onChange={setOptedOut}
          label="Opted out"
          description="Opted-out parents are skipped by every run, with the reason recorded in the log."
        />
      </div>
    </Modal>
  )
}

/** Set who receives parent messages, and start the conversation. */
export function ParentContactsPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ParentContact | null>(null)
  const contacts = useParentContacts()
  const sendIntro = useSendIntro()

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return contacts.data ?? []
    return (contacts.data ?? []).filter(
      (c) => c.student_name.toLowerCase().includes(term) || (c.parent_name ?? '').toLowerCase().includes(term) || (c.parent_whatsapp ?? '').includes(term),
    )
  }, [contacts.data, search])

  async function intro(contact: ParentContact) {
    try {
      await sendIntro.mutateAsync(contact.student_id)
      toast.show('Introduction sent')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  const columns: Column<ParentContact>[] = [
    { key: 'student', header: 'Student', render: (row) => <span className="font-semibold">{row.student_name}</span> },
    { key: 'parent', header: 'Parent', render: (row) => row.parent_name || <span className="text-muted">-</span> },
    {
      key: 'number',
      header: 'WhatsApp',
      render: (row) => (row.parent_whatsapp ? <span className="font-mono text-[12px]">{row.parent_whatsapp}</span> : <Badge tone="warning">Not set</Badge>),
    },
    { key: 'language', header: 'Language', render: (row) => <LanguageBadge language={row.parent_language} /> },
    {
      key: 'state',
      header: 'State',
      render: (row) =>
        row.parent_opted_out ? <Badge tone="danger">Opted out</Badge> : row.parent_intro_sent_at ? <Badge tone="success">Introduced</Badge> : <Badge tone="neutral">Not introduced</Badge>,
    },
    { key: 'lastheard', header: 'Last reply', render: (row) => <Timestamp at={row.parent_last_inbound_at} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.parent_whatsapp && !row.parent_intro_sent_at && !row.parent_opted_out ? (
            <Button variant="secondary" size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={() => intro(row)}>
              Send intro
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" icon={<UserRoundCog className="h-3.5 w-3.5" />} onClick={() => setEditing(row)}>
            Edit
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Parent contacts" description="Who receives messages for each student. A parent with no number is skipped by every run." />

      <SearchInput value={search} onChange={setSearch} placeholder="Search by student, parent or number…" className="max-w-xs" />

      <SectionCard title="Students" description="The introduction message asks parents to pick a language; reports go out in English until they do.">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.student_id}
          loading={contacts.isPending}
          error={contacts.isError ? apiErrorMessage(contacts.error) : null}
          pageSize={25}
          emptyState={<EmptyState icon={UserRoundCog} title="No students" description="Students appear here once they are enrolled." />}
        />
      </SectionCard>

      {editing ? <EditContactModal contact={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}
