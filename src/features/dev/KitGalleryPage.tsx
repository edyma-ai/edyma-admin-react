import { useState } from 'react'
import { Activity, GraduationCap, IndianRupee, Plus, Search, Trash2, Users } from 'lucide-react'
import { formatInr, formatNumber } from '@/lib/format'
import { AiBadge, Badge, ScoreBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, SectionCard } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { CopyField } from '@/components/ui/CopyField'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { FileDrop } from '@/components/ui/FileDrop'
import { FilterChip, FilterChipRow } from '@/components/ui/FilterChip'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatTile } from '@/components/ui/StatTile'
import { Stepper } from '@/components/ui/Stepper'
import { Switch } from '@/components/ui/Switch'
import { Tabs } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { Tooltip } from '@/components/ui/Tooltip'
import { useToast } from '@/components/ui/useToast'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { Bars } from '@/components/charts/Bars'
import { Donut } from '@/components/charts/Donut'
import { ScoreDistribution } from '@/components/charts/ScoreDistribution'
import { Sparkline } from '@/components/charts/Sparkline'

interface SampleStudent {
  id: string
  name: string
  section: string
  average: number
  atRisk: boolean
}

const SAMPLE_STUDENTS: SampleStudent[] = [
  { id: 'stu-01', name: 'Ananya Rao', section: '8A', average: 91, atRisk: false },
  { id: 'stu-02', name: 'Vikram Iyer', section: '8A', average: 67, atRisk: false },
  { id: 'stu-03', name: 'Meera Pillai', section: '8B', average: 48, atRisk: false },
  { id: 'stu-04', name: 'Arjun Nair', section: '8B', average: 32, atRisk: true },
  { id: 'stu-05', name: 'Sana Sheikh', section: '8C', average: 84, atRisk: false },
  { id: 'stu-06', name: 'Rohit Kulkarni', section: '8C', average: 58, atRisk: false },
]

const STUDENT_COLUMNS: Column<SampleStudent>[] = [
  { key: 'name', header: 'Student', render: (row) => <span className="font-semibold">{row.name}</span>, sortValue: (row) => row.name },
  { key: 'section', header: 'Section', render: (row) => row.section, sortValue: (row) => row.section },
  { key: 'average', header: 'Average', align: 'right', render: (row) => <ScoreBadge score={row.average} />, sortValue: (row) => row.average },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (row.atRisk ? <Badge tone="danger">At risk</Badge> : <Badge tone="success">On track</Badge>),
  },
]

const TREND = [
  { date: 'Jul 01', active: 132, minutes: 410 },
  { date: 'Jul 02', active: 155, minutes: 465 },
  { date: 'Jul 03', active: 149, minutes: 452 },
  { date: 'Jul 04', active: 171, minutes: 530 },
  { date: 'Jul 05', active: 96, minutes: 280 },
  { date: 'Jul 06', active: 118, minutes: 342 },
  { date: 'Jul 07', active: 187, minutes: 566 },
]

const MODE_MIX = [
  { mode: 'Flashcards', events: 420 },
  { mode: 'Quiz', events: 356 },
  { mode: 'Chat', events: 289 },
  { mode: 'Mindmap', events: 143 },
  { mode: 'Video', events: 98 },
]

const SCORE_BUCKETS = [
  { range: '0-19', count: 4 },
  { range: '20-39', count: 11 },
  { range: '40-59', count: 27 },
  { range: '60-79', count: 45 },
  { range: '80-100', count: 31 },
]

function GallerySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SectionCard title={title}>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </SectionCard>
  )
}

/** Dev-only gallery — eyeball the kit in Lumen and Eclipse before building screens on it. */
export function KitGalleryPage() {
  const { show } = useToast()
  const [tab, setTab] = useState('students')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [checked, setChecked] = useState(true)
  const [enabled, setEnabled] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(2)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Component kit"
        description="Every primitive of the rebuilt console. Check both themes before shipping screens."
        breadcrumbs={[{ label: 'Dev' }, { label: 'Kit gallery' }]}
        actions={
          <>
            <Button variant="secondary" icon={<Search className="h-4 w-4" />} onClick={() => show('Secondary action', 'info')}>
              Secondary
            </Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => show('Saved successfully')}>
              Primary
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Students" value={formatNumber(1284)} icon={<GraduationCap />} delta={{ value: '+12%', direction: 'up' }} />
        <StatTile
          label="Active 7d"
          value={formatNumber(412)}
          icon={<Activity />}
          delta={{ value: '-4%', direction: 'down' }}
          sparkline={<Sparkline data={TREND.map((point) => point.active)} />}
        />
        <StatTile label="Teachers" value={formatNumber(96)} icon={<Users />} delta={{ value: '0', direction: 'flat' }} />
        <StatTile label="AI cost 30d" value={formatInr(48250)} icon={<IndianRupee />} hint="₹ tracked per workflow" loading={false} />
      </div>

      <GallerySection title="Buttons">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger" icon={<Trash2 className="h-4 w-4" />}>
          Danger
        </Button>
        <Button loading>Saving</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <IconButton label="Delete row" variant="danger" icon={<Trash2 />} />
        <Tooltip content="Tooltips show on hover and focus">
          <IconButton label="Search" variant="secondary" icon={<Search />} />
        </Tooltip>
      </GallerySection>

      <GallerySection title="Badges">
        <Badge>Neutral</Badge>
        <Badge tone="sky">Sky</Badge>
        <Badge tone="success">Active</Badge>
        <Badge tone="warning">Pending</Badge>
        <Badge tone="danger">Failed</Badge>
        <Badge tone="info">Info</Badge>
        <AiBadge />
        <ScoreBadge score={92} />
        <ScoreBadge score={71} />
        <ScoreBadge score={45} />
        <ScoreBadge score={18} />
      </GallerySection>

      <SectionCard title="Fields">
        <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="School name" placeholder="Edyma Academy" required />
          <Input label="Admission id" mono placeholder="EDY-2026-0148" hint="Rendered in mono" />
          <Input label="Email" type="email" error="This email is already registered" defaultValue="dup@school.edu" />
          <Select
            label="Plan"
            placeholder="Choose a plan"
            defaultValue=""
            options={[
              { value: 'core', label: 'Core' },
              { value: 'plus', label: 'Plus' },
              { value: 'premium', label: 'Premium' },
            ]}
          />
          <Textarea label="Note" placeholder="Add an internal note…" className="sm:col-span-2" />
          <SearchInput value={search} onChange={setSearch} placeholder="Search students…" />
          <div className="flex flex-col gap-3">
            <Checkbox label="Send credentials by email" description="One-time passwords expire in 7 days" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <Switch label="Study Lab enabled" checked={enabled} onChange={setEnabled} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Wizard & import" description="Stepper, one-time credentials and the CSV drop target (9E onboarding kit).">
        <div className="flex max-w-3xl flex-col gap-5">
          <Stepper steps={[{ label: 'School' }, { label: 'Plan' }, { label: 'Sections' }, { label: 'Manager' }, { label: 'Review' }]} current={wizardStep} onStepSelect={setWizardStep} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" disabled={wizardStep === 0} onClick={() => setWizardStep(wizardStep - 1)}>
              Back
            </Button>
            <Button size="sm" disabled={wizardStep === 4} onClick={() => setWizardStep(wizardStep + 1)}>
              Next
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CopyField label="Manager password" value="amber-cedar-42" hint="Shown once. Copy before leaving" />
            <FileDrop accept=".csv" title="Drop a CSV here" hint="email, display_name, role, section_label" onFile={(file) => show(`Parsed ${file.name}`, 'info')} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Tabs, chips and states" padded={false}>
        <div className="flex flex-col gap-4 px-5 pb-5">
          <Tabs
            tabs={[
              { value: 'students', label: 'Students' },
              { value: 'teachers', label: 'Teachers' },
              { value: 'insights', label: 'Insights' },
              { value: 'archived', label: 'Archived', disabled: true },
            ]}
            value={tab}
            onChange={setTab}
          />
          <FilterChipRow>
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} count={128}>
              All
            </FilterChip>
            <FilterChip active={filter === 'new'} onClick={() => setFilter('new')} count={24}>
              New
            </FilterChip>
            <FilterChip active={filter === 'converted'} onClick={() => setFilter('converted')} count={9}>
              Converted
            </FilterChip>
          </FilterChipRow>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card padded={false}>
              <EmptyState title="No leads yet" description="New leads from the website land here." action={<Button size="sm">Add lead</Button>} />
            </Card>
            <Card padded={false}>
              <ErrorState message="The analytics service timed out." onRetry={() => show('Retrying…', 'info')} />
            </Card>
            <Card className="flex flex-col gap-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-24 w-full" />
            </Card>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="DataTable" description="Client sort, pagination, sticky header, row click." padded={false}>
        <DataTable
          columns={STUDENT_COLUMNS}
          rows={SAMPLE_STUDENTS}
          rowKey={(row) => row.id}
          pageSize={4}
          initialSort={{ key: 'average', direction: 'desc' }}
          onRowClick={() => setDrawerOpen(true)}
          className="rounded-t-none border-x-0 border-b-0 shadow-none"
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Area trend" description="DAU and minutes, mono ticks, calm motion.">
          <AreaTrend
            data={TREND}
            xKey="date"
            series={[
              { key: 'active', label: 'Active students' },
              { key: 'minutes', label: 'Minutes' },
            ]}
          />
        </SectionCard>
        <SectionCard title="Mode mix">
          <Bars data={MODE_MIX} xKey="mode" series={[{ key: 'events', label: 'Events' }]} />
        </SectionCard>
        <SectionCard title="Score distribution" description="4-band scale: ≥80 green · ≥60 blue · ≥40 amber · <40 red.">
          <ScoreDistribution data={SCORE_BUCKETS} />
        </SectionCard>
        <SectionCard title="Donut">
          <Donut
            centerLabel="118"
            centerCaption="evaluations"
            data={[
              { name: 'Strong', value: 52 },
              { name: 'Getting there', value: 41 },
              { name: 'Needs work', value: 25 },
            ]}
          />
        </SectionCard>
      </div>

      <GallerySection title="Overlays">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
          Open drawer
        </Button>
        <Button variant="ghost" onClick={() => show('Something went wrong', 'error')}>
          Error toast
        </Button>
      </GallerySection>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create section"
        description="Sections group students within a class."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setModalOpen(false)
                show('Section created')
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Label" placeholder="8A" required />
          <Select
            label="Class"
            placeholder="Choose a class"
            defaultValue=""
            options={[
              { value: 'class-8', label: 'Class 8' },
              { value: 'class-9', label: 'Class 9' },
            ]}
          />
        </div>
      </Modal>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Ananya Rao" description="Class 8 · Section 8A">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ScoreBadge score={91} />
            <Badge tone="success">On track</Badge>
            <AiBadge>AI evaluated</AiBadge>
          </div>
          <Sparkline data={[62, 70, 68, 75, 81, 88, 91]} height={48} />
          <p className="text-[13px] text-muted">
            Drawers carry detail panes (leads, tickets, user usage) without leaving the list behind.
          </p>
        </div>
      </Drawer>
    </div>
  )
}
