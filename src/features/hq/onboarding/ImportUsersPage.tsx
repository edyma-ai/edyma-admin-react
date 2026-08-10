import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, ClipboardCopy, Download, ShieldCheck, Upload } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useSchools } from '@/api/queries/schools'
import { useSections } from '@/api/queries/sections'
import { useBulkImportUsers } from '@/api/queries/users'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { FileDrop } from '@/components/ui/FileDrop'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Stepper } from '@/components/ui/Stepper'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { buildCsv, downloadCsv, parseCsv } from '@/lib/csv'
import type { BulkImportRowResult } from '@/types/users'
import {
  IMPORT_FIELDS,
  autoMapColumns,
  buildImportRows,
  buildSectionLookup,
  looksLikeHeader,
  type ColumnMapping,
  type ImportRow,
} from '@/features/hq/onboarding/importModel'

const MAX_ROWS = 500
const WIZARD_STEPS = [{ label: 'Upload' }, { label: 'Map & validate' }, { label: 'Results' }]

interface ResultRow extends ImportRow {
  result: BulkImportRowResult
}

function statusBadge(row: ImportRow, serverResult: BulkImportRowResult | undefined) {
  if (row.error) return <Badge tone="danger">{row.error}</Badge>
  if (serverResult?.status === 'error') return <Badge tone="danger">{serverResult.error ?? 'Rejected'}</Badge>
  if (serverResult?.status === 'valid') return <Badge tone="success">Valid</Badge>
  return <Badge tone="neutral">Ready</Badge>
}

/** CSV bulk import for one school: upload/paste → map columns → client + dry-run validation → import → one-time credentials. */
export function ImportUsersPage() {
  const { schoolId = '' } = useParams()
  const { user: me } = useAuth()
  const toast = useToast()

  const schools = useSchools()
  const school = useMemo(() => schools.data?.find((entry) => entry.id === schoolId), [schools.data, schoolId])

  // Sales can import but can't read /sections — labels then can't resolve and are skipped with a notice.
  const canResolveSections = me?.role === 'super_admin'
  const sections = useSections(schoolId, canResolveSections)
  const sectionLookup = useMemo(() => (canResolveSections && sections.data ? buildSectionLookup(sections.data) : null), [canResolveSections, sections.data])

  const [rawRows, setRawRows] = useState<string[][] | null>(null)
  const [hasHeader, setHasHeader] = useState(true)
  const [mapping, setMapping] = useState<ColumnMapping>({ email: -1, displayName: -1, role: -1, sectionLabel: -1 })
  const [pasteText, setPasteText] = useState('')

  const [dryRunResults, setDryRunResults] = useState<Map<number, BulkImportRowResult> | null>(null)
  const [finalResults, setFinalResults] = useState<ResultRow[] | null>(null)

  const bulkImport = useBulkImportUsers()

  const dataRows = useMemo(() => (rawRows ? (hasHeader ? rawRows.slice(1) : rawRows) : []), [rawRows, hasHeader])
  const headers = useMemo(() => {
    if (!rawRows?.length) return []
    const width = Math.max(...rawRows.map((row) => row.length))
    return Array.from({ length: width }, (_, index) => (hasHeader ? rawRows[0][index]?.trim() || `Column ${index + 1}` : `Column ${index + 1}`))
  }, [rawRows, hasHeader])

  const rows = useMemo(() => buildImportRows(dataRows, mapping, sectionLookup), [dataRows, mapping, sectionLookup])
  const cleanRows = useMemo(() => rows.filter((row) => !row.error), [rows])
  const mappingComplete = IMPORT_FIELDS.every((field) => !field.required || mapping[field.key] >= 0)
  const hasUnresolvedLabels = !canResolveSections && rows.some((row) => row.sectionLabel)
  const dryRunClean = dryRunResults !== null && cleanRows.length > 0 && cleanRows.every((row) => dryRunResults.get(row.line)?.status === 'valid')

  function ingest(text: string) {
    const parsed = parseCsv(text)
    if (parsed.length === 0) {
      toast.show('Nothing parseable in that input', 'error')
      return
    }
    const headerDetected = looksLikeHeader(parsed[0])
    setRawRows(parsed)
    setHasHeader(headerDetected)
    setMapping(autoMapColumns(headerDetected ? parsed[0] : []))
    setDryRunResults(null)
  }

  function patchMapping(field: keyof ColumnMapping, value: string) {
    setMapping((prev) => ({ ...prev, [field]: value === '' ? -1 : Number(value) }))
    setDryRunResults(null)
  }

  async function runImport(dryRun: boolean) {
    try {
      const submitted = cleanRows
      const response = await bulkImport.mutateAsync({
        school_id: schoolId,
        dry_run: dryRun,
        rows: submitted.map((row) => ({
          email: row.email,
          display_name: row.displayName,
          role: row.role as 'teacher' | 'student',
          section_id: row.sectionId,
        })),
      })
      const byLine = new Map(response.results.map((result) => [submitted[result.index]?.line ?? -1, result]))
      if (dryRun) {
        setDryRunResults(byLine)
        if (response.errors === 0) toast.show(`All ${response.total} rows passed server validation`)
        else toast.show(`${response.errors} of ${response.total} rows failed server validation`, 'error')
      } else {
        setFinalResults(submitted.map((row) => ({ ...row, result: byLine.get(row.line) ?? { index: -1, email: row.email, status: 'error', error: 'No result returned' } })))
        toast.show(`${response.created} account${response.created === 1 ? '' : 's'} created`)
      }
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  const previewColumns = useMemo<Column<ImportRow>[]>(
    () => [
      { key: 'line', header: '#', mono: true, width: '3rem', render: (row) => row.line, sortValue: (row) => row.line },
      { key: 'email', header: 'Email', mono: true, render: (row) => row.email || '—' },
      { key: 'name', header: 'Display name', render: (row) => row.displayName || '—' },
      {
        key: 'role',
        header: 'Role',
        render: (row) => (row.role ? <Badge tone={row.role === 'teacher' ? 'success' : 'neutral'}>{row.role}</Badge> : row.rawRole || '—'),
      },
      {
        key: 'section',
        header: 'Section',
        render: (row) =>
          row.sectionLabel ? (
            row.sectionId ? (
              <Badge tone="sky">{row.sectionLabel}</Badge>
            ) : (
              <span className="text-muted">{row.sectionLabel}</span>
            )
          ) : (
            '—'
          ),
      },
      { key: 'status', header: 'Status', render: (row) => statusBadge(row, dryRunResults?.get(row.line)) },
    ],
    [dryRunResults],
  )

  const resultColumns = useMemo<Column<ResultRow>[]>(
    () => [
      { key: 'email', header: 'Email', mono: true, render: (row) => row.email },
      { key: 'name', header: 'Display name', render: (row) => row.displayName },
      { key: 'role', header: 'Role', render: (row) => <Badge tone={row.role === 'teacher' ? 'success' : 'neutral'}>{row.role}</Badge> },
      {
        key: 'status',
        header: 'Status',
        render: (row) =>
          row.result.status === 'created' ? <Badge tone="success">Created</Badge> : <Badge tone="danger">{row.result.error ?? 'Failed'}</Badge>,
      },
      {
        key: 'password',
        header: 'Password',
        mono: true,
        render: (row) => row.result.generated_password ?? '—',
      },
    ],
    [],
  )

  if (schools.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (schools.isError) {
    return <ErrorState message={apiErrorMessage(schools.error)} onRetry={() => void schools.refetch()} />
  }
  if (!school) {
    return <EmptyState title="School not found" description="It may have been removed, or the link is stale." />
  }

  const stage = finalResults ? 2 : rawRows ? 1 : 0
  const credentialRows = (finalResults ?? []).filter((row) => row.result.status === 'created' && row.result.generated_password)
  const credentialsCsv = [['email', 'display_name', 'role', 'password'], ...credentialRows.map((row) => [row.email, row.displayName, row.role ?? '', row.result.generated_password ?? ''])]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Schools', to: '/schools' }, { label: school.name, to: `/schools/${school.id}` }, { label: 'Import users' }]}
        title="Import users from CSV"
        description={`Bulk-create teachers and students in ${school.name}, validated twice before anything is written.`}
      />

      <Stepper steps={WIZARD_STEPS} current={stage} className="max-w-xl" />

      {stage === 0 ? (
        <div className="grid max-w-3xl gap-5">
          <FileDrop
            accept=".csv,text/csv"
            title="Drop a CSV here, or click to browse"
            hint="Columns: email, display_name, role (teacher/student), section_label (optional)"
            onFile={(file) => {
              void file.text().then(ingest)
            }}
          />
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-hairline" />
            or paste
            <span className="h-px flex-1 bg-hairline" />
          </div>
          <div className="flex flex-col gap-2">
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              placeholder={'email,display_name,role,section_label\nasha@school.in,Asha Rao,student,8A'}
              className="[&_textarea]:font-mono [&_textarea]:text-xs"
            />
            <Button className="self-end" disabled={!pasteText.trim()} onClick={() => ingest(pasteText)}>
              Parse pasted text
            </Button>
          </div>
        </div>
      ) : null}

      {stage === 1 && rawRows ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-3">
            {IMPORT_FIELDS.map((field) => (
              <Select
                key={field.key}
                label={field.required ? field.label : `${field.label} (optional)`}
                className="w-48"
                value={mapping[field.key] >= 0 ? String(mapping[field.key]) : ''}
                onChange={(e) => patchMapping(field.key, e.target.value)}
                options={[{ value: '', label: 'Not mapped' }, ...headers.map((header, index) => ({ value: String(index), label: header }))]}
              />
            ))}
            <Checkbox label="First row is headers" checked={hasHeader} onChange={(e) => {
              setHasHeader(e.target.checked)
              setDryRunResults(null)
            }} className="mb-2.5" />
          </div>

          {dataRows.length > MAX_ROWS ? (
            <Card padded={false} className="border-danger/40 bg-danger-soft/40 px-4 py-2.5">
              <p className="text-[13px] font-semibold text-danger">
                {dataRows.length} rows. Imports are capped at {MAX_ROWS}. Split the file and run it in batches.
              </p>
            </Card>
          ) : null}
          {hasUnresolvedLabels ? (
            <Card padded={false} className="border-warning/40 bg-warning-soft/40 px-4 py-2.5">
              <p className="text-[13px] text-warning">
                <span className="font-semibold">Section labels ignored.</span> Resolving them needs a super-admin role. Accounts import unsectioned; a super
                admin or the school manager can place them afterwards.
              </p>
            </Card>
          ) : null}

          <DataTable
            columns={previewColumns}
            rows={rows}
            rowKey={(row) => String(row.line)}
            pageSize={15}
            emptyState={<EmptyState title="No data rows" description="Everything parsed as headers. Uncheck 'First row is headers' if that's wrong." />}
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setRawRows(null)
                setDryRunResults(null)
              }}
            >
              Start over
            </Button>
            <div className="flex-1" />
            <p className="text-[13px] text-muted">
              <span className="font-mono font-semibold text-ink">{cleanRows.length}</span> of{' '}
              <span className="font-mono font-semibold text-ink">{rows.length}</span> rows ready
            </p>
            <Button
              variant="secondary"
              icon={<ShieldCheck className="h-4 w-4" />}
              disabled={!mappingComplete || cleanRows.length === 0 || dataRows.length > MAX_ROWS}
              loading={bulkImport.isPending && !dryRunResults}
              onClick={() => void runImport(true)}
            >
              Validate (dry run)
            </Button>
            <Button
              icon={<Upload className="h-4 w-4" />}
              disabled={!dryRunClean}
              loading={bulkImport.isPending && Boolean(dryRunResults)}
              onClick={() => void runImport(false)}
            >
              Import {cleanRows.length} user{cleanRows.length === 1 ? '' : 's'}
            </Button>
          </div>
          {!dryRunResults && mappingComplete && cleanRows.length > 0 ? (
            <p className="-mt-3 self-end text-xs text-muted">Run the dry-run first. The import unlocks once the server clears every row.</p>
          ) : null}
        </div>
      ) : null}

      {stage === 2 && finalResults ? (
        <div className="flex flex-col gap-5">
          <Card padded={false} className="flex items-start gap-3 border-warning/40 bg-warning-soft/40 px-4 py-3">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-[13px] text-warning">
              <span className="font-semibold">Passwords are shown once.</span> They are stored hashed and can never be recovered. Download or copy the
              credentials before leaving this page.
            </p>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={<Download className="h-4 w-4" />}
              disabled={credentialRows.length === 0}
              onClick={() => downloadCsv(`${school.name.toLowerCase().replace(/\s+/g, '-')}-credentials.csv`, credentialsCsv)}
            >
              Download credentials CSV
            </Button>
            <Button
              variant="secondary"
              icon={<ClipboardCopy className="h-4 w-4" />}
              disabled={credentialRows.length === 0}
              onClick={() => {
                void navigator.clipboard.writeText(buildCsv(credentialsCsv)).then(() => toast.show('Credentials copied as CSV'))
              }}
            >
              Copy all
            </Button>
            <p className="text-[13px] text-muted">
              <span className="font-mono font-semibold text-ink">{credentialRows.length}</span> account{credentialRows.length === 1 ? '' : 's'} created
              {finalResults.length - credentialRows.length > 0 ? (
                <>
                  {' '}
                  · <span className="font-mono font-semibold text-danger">{finalResults.length - credentialRows.length}</span> failed
                </>
              ) : null}
            </p>
          </div>

          <DataTable columns={resultColumns} rows={finalResults} rowKey={(row) => String(row.line)} pageSize={20} />
        </div>
      ) : null}
    </div>
  )
}
