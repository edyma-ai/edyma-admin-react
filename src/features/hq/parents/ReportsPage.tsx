import { useState } from 'react'
import { FileText, Send } from 'lucide-react'
import {
  useGeneratedPeriods,
  useGenerateReports,
  useParentBatches,
  useParentCommsJob,
  usePeriodReports,
  usePublishReports,
  useReportsPreview,
} from '@/api/queries/parentComms'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, SectionCard } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { StatTile } from '@/components/ui/StatTile'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { ParentBatch, PeriodReportRow, PeriodType } from '@/types/parentComms'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'

const OUTLOOK: Record<PeriodReportRow['outlook'], { tone: 'success' | 'warning' | 'neutral'; label: string }> = {
  send: { tone: 'success', label: 'Will send' },
  skip: { tone: 'warning', label: 'Will skip' },
  already_sent: { tone: 'neutral', label: 'Already sent' },
}

const REPORT_COLUMNS: Column<PeriodReportRow>[] = [
  { key: 'student', header: 'Student', render: (row) => <span className="font-semibold">{row.student_name || row.student_id}</span> },
  {
    key: 'days',
    header: 'Days studied',
    mono: true,
    align: 'right',
    render: (row) => `${row.active_days}/${row.days_in_period}`,
  },
  { key: 'minutes', header: 'Minutes', mono: true, align: 'right', render: (row) => row.minutes_spent || '-' },
  { key: 'language', header: 'Language', render: (row) => <Badge tone="neutral">{row.language}</Badge> },
  {
    key: 'outlook',
    header: 'On publish',
    render: (row) => (
      <div className="flex flex-col gap-0.5">
        <Badge tone={OUTLOOK[row.outlook].tone}>{OUTLOOK[row.outlook].label}</Badge>
        {row.skip_reason ? <span className="text-xs text-muted">{row.skip_reason}</span> : null}
      </div>
    ),
  },
]

const BATCH_COLUMNS: Column<ParentBatch>[] = [
  { key: 'period', header: 'Run', render: (row) => <span className="font-semibold">{row.period_key ?? 'Notice'}</span> },
  { key: 'kind', header: 'Type', render: (row) => <Badge tone="neutral">{row.kind.replace('_', ' ')}</Badge> },
  { key: 'sent', header: 'Sent', mono: true, align: 'right', render: (row) => row.counts.sent + row.counts.delivered + row.counts.read },
  { key: 'delivered', header: 'Delivered', mono: true, align: 'right', render: (row) => row.counts.delivered + row.counts.read },
  { key: 'read', header: 'Read', mono: true, align: 'right', render: (row) => row.counts.read },
  {
    key: 'failed',
    header: 'Failed',
    mono: true,
    align: 'right',
    render: (row) => (row.counts.failed ? <span className="text-danger">{row.counts.failed}</span> : '-'),
  },
  { key: 'skipped', header: 'Skipped', mono: true, align: 'right', render: (row) => row.counts.skipped || '-' },
  { key: 'created', header: 'When', render: (row) => <Timestamp at={row.created_at} /> },
]

/**
 * Generate then publish. Two steps on purpose: generating is harmless and
 * repeatable, publishing reaches real parents and costs money, so the numbers
 * can be reviewed before anything is sent.
 */
export function ParentReportsPage() {
  const toast = useToast()
  const [periodType, setPeriodType] = useState<PeriodType>('weekly')
  const [jobId, setJobId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  // null means "follow the latest complete period". Choosing an older period
  // is what stops a generated-but-unpublished week from being stranded.
  const [chosenPeriod, setChosenPeriod] = useState<string | null>(null)
  const [reading, setReading] = useState<PeriodReportRow | null>(null)

  const preview = useReportsPreview(periodType)
  const periods = useGeneratedPeriods(periodType)
  const periodKey = chosenPeriod ?? preview.data?.period_key ?? null
  const periodReports = usePeriodReports(periodType, periodKey)
  const batches = useParentBatches()
  const generate = useGenerateReports()
  const publish = usePublishReports()
  const job = useParentCommsJob(jobId)

  const running = job.data?.status === 'queued' || job.data?.status === 'running'
  const isLatest = !chosenPeriod || chosenPeriod === preview.data?.period_key
  const counts = periodReports.data?.counts
  const nothingToSend = counts ? counts.send === 0 : false

  // A bare "will skip: 14" tells an admin nothing actionable. Naming the
  // reasons is what turns it into a to-do list (fix 3 numbers, ignore 11).
  const skipHint = [
    ...Object.entries(periodReports.data?.skip_reasons ?? {}).map(([reason, n]) => `${n} ${reason.replace(/\.$/, '').toLowerCase()}`),
    counts?.already_sent ? `${counts.already_sent} already sent` : '',
  ]
    .filter(Boolean)
    .join(' · ') || 'No activity, no number, or opted out'


  async function runGenerate() {
    try {
      const result = await generate.mutateAsync(periodType)
      setJobId(result.job_id)
      setChosenPeriod(null)
      toast.show('Generating reports - this runs in the background')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  async function runPublish() {
    setConfirming(false)
    if (!periodKey) return
    try {
      const result = await publish.mutateAsync({ periodType, periodKey })
      setJobId(result.job_id)
      toast.show('Publishing - messages are being sent')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Progress reports"
        description="Weekly and monthly summaries for parents over WhatsApp. Generate computes the numbers and sends nothing; Publish is what reaches parents."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={<FileText className="h-4 w-4" />} loading={generate.isPending} onClick={runGenerate}>
              Generate
            </Button>
            <Button
              icon={<Send className="h-4 w-4" />}
              loading={publish.isPending}
              disabled={!periodKey || !preview.data?.template_ready || nothingToSend}
              onClick={() => setConfirming(true)}
            >
              Publish
            </Button>
          </div>
        }
      />

      {preview.data && !preview.data.template_ready ? (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm font-semibold">Publishing is blocked</p>
          <p className="mt-1 text-sm text-muted">{preview.data.template_blocker}</p>
          <p className="mt-2 text-sm text-muted">
            Generating still works and is safe to run now - it only computes the numbers. Nothing reaches a parent until a template is approved.
          </p>
        </Card>
      ) : null}

      <Tabs
        value={periodType}
        onChange={(value) => {
          // A period key from the other tab would not exist here.
          setPeriodType(value as PeriodType)
          setChosenPeriod(null)
        }}
        tabs={[
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
      />

      <Card className="flex flex-col gap-2">
        <Select
          label="Period"
          value={periodKey ?? ''}
          onChange={(event) => setChosenPeriod(event.target.value || null)}
          options={(periods.data ?? []).map((entry) => ({
            value: entry.period_key,
            label: `${entry.period_key}${entry.fully_published ? ' (published)' : ''} - ${entry.generated} report(s)`,
          }))}
          placeholder={preview.data?.period_key ?? 'Latest complete period'}
          hint={
            isLatest
              ? 'The most recent completed period. Older generated periods stay selectable so none is stranded.'
              : 'Publishing an older period sends it as a separate message, with the numbers as they were then.'
          }
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Will send"
          value={counts ? String(counts.send) : '-'}
          loading={periodReports.isPending}
          hint={periodReports.data ? `${periodReports.data.distinct_parents} distinct parent(s)` : 'Reports with activity and a reachable parent'}
        />
        <StatTile
          label="Will skip"
          value={counts ? String(counts.skip) : '-'}
          loading={periodReports.isPending}
          hint={skipHint}
        />
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Job</p>
          {running ? (
            <span className="text-sm">
              {job.data?.kind === 'generate_reports' ? 'Generating' : 'Sending'} - {job.data?.progress.done ?? 0} of {job.data?.progress.total ?? 0}
            </span>
          ) : job.data?.status === 'failed' ? (
            <span className="text-sm text-danger">{job.data.error_message ?? 'Failed'}</span>
          ) : job.data?.status === 'succeeded' ? (
            <span className="text-sm text-success">Finished</span>
          ) : (
            <span className="text-sm text-muted">Idle</span>
          )}
        </Card>
      </div>

      <SectionCard
        title={`Generated reports${periodKey ? ` - ${periodKey}` : ''}`}
        description="What each parent would receive. Click a row to read the exact message before you publish. Days studied counts reading, video, flashcards, mindmaps, quizzes and mock tests; time in Ask Edyma is not counted as studying."
      >
        <DataTable
          columns={REPORT_COLUMNS}
          rows={periodReports.data?.reports ?? []}
          rowKey={(row) => row.student_id}
          loading={periodReports.isPending}
          error={periodReports.isError ? apiErrorMessage(periodReports.error) : null}
          onRowClick={(row) => setReading(row)}
          emptyState={
            <EmptyState
              icon={FileText}
              title="Nothing generated for this period"
              description="Run Generate first. It only computes the numbers and sends nothing."
            />
          }
        />
      </SectionCard>

      <SectionCard title="Recent runs" description="Counts update as WhatsApp reports delivery - a run keeps changing after it finishes.">
        <DataTable
          columns={BATCH_COLUMNS}
          rows={batches.data ?? []}
          rowKey={(row) => row.id}
          loading={batches.isPending}
          error={batches.isError ? apiErrorMessage(batches.error) : null}
          emptyState={<EmptyState icon={Send} title="Nothing published yet" description="Generate a period, then publish it to reach parents." />}
        />
      </SectionCard>

      <Modal
        open={Boolean(reading)}
        onClose={() => setReading(null)}
        title={reading?.student_name ?? ''}
        description={reading ? `${reading.parent_name ? `${reading.parent_name} · ` : ''}${reading.parent_whatsapp ?? 'No number on file'}` : undefined}
      >
        {reading?.body_text ? (
          <p className="whitespace-pre-wrap text-sm text-ink">{reading.body_text}</p>
        ) : (
          <p className="text-sm text-muted">No message text - this report has nothing to send.</p>
        )}
      </Modal>

      {confirming ? (
        <ConfirmModal
          title={`Publish ${periodKey ?? ''}?`}
          description={`This sends a WhatsApp message to ${counts?.send ?? 0} parent(s)${
            periodReports.data ? ` (${periodReports.data.distinct_parents} distinct number(s))` : ''
          }. It cannot be undone, and a period can only be published once per school.`}
          confirmLabel="Publish"
          onConfirm={runPublish}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </div>
  )
}
