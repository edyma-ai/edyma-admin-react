import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RotateCcw, Save } from 'lucide-react'
import { useLlmConfigs, useUpdateLlmConfig } from '@/api/queries/ops'
import { Card, SectionCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import type { LlmConfigDoc } from '@/types/ops'
import { ConfirmModal } from '@/features/hq/content/shared/ConfirmModal'

/** Metadata keys that are not editable model parameters. */
const NON_PARAM_KEYS = new Set(['id', 'config_key', 'label', 'description', 'prompts', 'created_at', 'updated_at'])

interface ParamField {
  key: string
  kind: 'string' | 'number'
}

function paramFields(doc: LlmConfigDoc): ParamField[] {
  return Object.entries(doc)
    .filter(([key, value]) => !NON_PARAM_KEYS.has(key) && (typeof value === 'string' || typeof value === 'number'))
    .map(([key, value]) => ({ key, kind: typeof value as 'string' | 'number' }))
}

function paramLabel(key: string): string {
  const spaced = key.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function textareaRows(text: string): number {
  return Math.min(16, Math.max(4, text.split('\n').length + 1))
}

interface EditorProps {
  doc: LlmConfigDoc
  /** Lets the page guard tab switches behind a confirm while edits are unsaved. */
  onDirtyChange: (dirty: boolean) => void
}

/** Form over one config document: scalar model parameters + every prompt template, saved as a whole. */
function LlmConfigEditor({ doc, onDirtyChange }: EditorProps) {
  const toast = useToast()
  const update = useUpdateLlmConfig(doc.config_key)

  const fields = useMemo(() => paramFields(doc), [doc])
  const basePrompts = useMemo(() => (doc.prompts ?? {}) as Record<string, string>, [doc])
  const baseParams = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, String(doc[field.key])])), [fields, doc])

  const [params, setParams] = useState(baseParams)
  const [prompts, setPrompts] = useState(basePrompts)
  const [confirming, setConfirming] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Keys can appear after mount (a refetch delivering another admin's additions) —
  // anything absent from local state falls back to the latest doc's value.
  const dirty = useMemo(
    () =>
      fields.some((field) => params[field.key] != null && params[field.key] !== baseParams[field.key]) ||
      Object.keys(prompts).some((key) => prompts[key] !== (basePrompts[key] ?? '')),
    [fields, params, baseParams, prompts, basePrompts],
  )

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  function reset() {
    setParams(baseParams)
    setPrompts(basePrompts)
    setSaveError(null)
  }

  function buildPayload(): Record<string, unknown> | null {
    // Merge over the latest doc so params/prompts never edited locally survive the whole-doc save.
    const payload: Record<string, unknown> = { prompts: { ...basePrompts, ...prompts } }
    for (const field of fields) {
      const raw = (params[field.key] ?? baseParams[field.key]).trim()
      if (field.kind === 'number') {
        const parsed = Number(raw)
        if (raw === '' || Number.isNaN(parsed)) {
          setSaveError(`"${paramLabel(field.key)}" must be a number.`)
          return null
        }
        if (parsed < 0) {
          setSaveError(`"${paramLabel(field.key)}" cannot be negative.`)
          return null
        }
        payload[field.key] = parsed
      } else {
        payload[field.key] = raw
      }
    }
    return payload
  }

  function requestSave() {
    setSaveError(null)
    if (buildPayload()) setConfirming(true)
  }

  async function save() {
    const payload = buildPayload()
    if (!payload) {
      setConfirming(false)
      return
    }
    try {
      await update.mutateAsync(payload)
      toast.show(`Config "${doc.config_key}" saved`)
      setConfirming(false)
      setSaveError(null)
    } catch (err) {
      setConfirming(false)
      setSaveError(apiErrorMessage(err))
    }
  }

  const promptKeys = Object.keys(basePrompts)

  return (
    <div className="flex flex-col gap-5">
      {doc.description ? <p className="max-w-3xl text-[13px] text-muted">{doc.description}</p> : null}

      <SectionCard title="Model parameters" description="Model routing, temperature and thinking budgets for this workflow.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <Input
              key={field.key}
              label={paramLabel(field.key)}
              mono
              type={field.kind === 'number' ? 'number' : 'text'}
              step={field.kind === 'number' ? 'any' : undefined}
              min={field.kind === 'number' ? 0 : undefined}
              value={params[field.key] ?? baseParams[field.key] ?? ''}
              onChange={(e) => setParams((prev) => ({ ...prev, [field.key]: e.target.value }))}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Prompts" description={`${promptKeys.length} template${promptKeys.length === 1 ? '' : 's'}. Placeholders in braces are filled by the workflow at runtime.`}>
        <div className="flex flex-col gap-5">
          {promptKeys.map((key) => (
            <div key={key}>
              <p className="mb-1.5 font-mono text-xs font-semibold text-ink">{key}</p>
              <Textarea
                aria-label={`Prompt template ${key}`}
                className="[&_textarea]:font-mono [&_textarea]:text-xs [&_textarea]:leading-relaxed"
                rows={textareaRows(prompts[key] ?? basePrompts[key] ?? '')}
                value={prompts[key] ?? basePrompts[key] ?? ''}
                onChange={(e) => setPrompts((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 rounded-card border border-hairline bg-elevated px-4 py-3 shadow-pop">
        {saveError ? (
          <p role="alert" className="mr-auto text-[13px] font-medium text-danger">
            {saveError}
          </p>
        ) : (
          <p className="mr-auto text-[13px] text-muted">{dirty ? 'Unsaved changes' : 'No changes'}</p>
        )}
        <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} disabled={!dirty || update.isPending} onClick={reset}>
          Discard
        </Button>
        <Button icon={<Save className="h-4 w-4" />} disabled={!dirty} loading={update.isPending} onClick={requestSave}>
          Save changes
        </Button>
      </div>

      {confirming ? (
        <ConfirmModal
          title={`Update the live "${doc.config_key}" config?`}
          description="This rewrites prompts and model parameters used by production AI workflows. The next request picks them up immediately."
          confirmLabel="Save to live config"
          tone="danger"
          loading={update.isPending}
          onConfirm={() => void save()}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </div>
  )
}

/** LLM configuration editor — one tab per workflow config document in `llm_config`. */
export function LlmConfigPage() {
  const configs = useLlmConfigs()
  const [searchParams, setSearchParams] = useSearchParams()

  const keys = useMemo(() => Object.keys(configs.data ?? {}).sort(), [configs.data])
  const requested = searchParams.get('config')
  const activeKey = requested && keys.includes(requested) ? requested : keys[0]
  const doc = activeKey ? configs.data?.[activeKey] : undefined

  // Switching tabs unmounts the keyed editor, so unsaved edits need an explicit confirm first.
  const [dirty, setDirty] = useState(false)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  function switchTo(key: string) {
    setDirty(false)
    setPendingKey(null)
    setSearchParams({ config: key }, { replace: true })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="LLM config"
        description="Prompts and model parameters per AI workflow, read straight from the database. Edits go live without a deploy."
      />

      {configs.isPending ? (
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-40 w-full" />
        </Card>
      ) : configs.isError ? (
        <Card padded={false}>
          <ErrorState message={apiErrorMessage(configs.error)} onRetry={() => void configs.refetch()} />
        </Card>
      ) : (
        <>
          <Tabs
            tabs={keys.map((key) => ({ value: key, label: configs.data?.[key]?.label || key }))}
            value={activeKey ?? ''}
            onChange={(key) => (dirty ? setPendingKey(key) : switchTo(key))}
          />
          {/* Keyed by config so switching tabs never leaks edits across documents. */}
          {doc ? <LlmConfigEditor key={doc.config_key} doc={doc} onDirtyChange={setDirty} /> : null}
          {pendingKey ? (
            <ConfirmModal
              title="Discard unsaved changes?"
              description={`"${activeKey}" has unsaved edits. Switching tabs throws them away.`}
              confirmLabel="Discard and switch"
              tone="danger"
              onConfirm={() => switchTo(pendingKey)}
              onClose={() => setPendingKey(null)}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
