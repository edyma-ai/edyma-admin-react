import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Save, ChevronDown, ChevronRight, Info, Cpu } from 'react-feather'
import { api } from '@/api/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/cn'

interface LLMConfigDoc {
  id: string
  config_key: string
  label: string
  description: string
  prompts: Record<string, string>
  model_id?: string
  scope_model_id?: string
}

type ConfigMap = Record<string, LLMConfigDoc>

const PLACEHOLDER_DOCS: Record<string, Record<string, string[]>> = {
  chat: {
    scope_check_system: ['{current_chapter_code}', '{current_subject}', '{current_chapter}', '{table_of_contents}'],
    chat_system: ['{current_subject}', '{current_chapter}', '{chapter_section}'],
  },
  evaluation: {
    status_system: ['{question_text}', '{teacher_key_text}'],
    feedback_system: ['{chapter_section}'],
  },
  overall_evaluation: {
    system: ['{grade_line}', '{criteria_block}'],
  },
  tlm: {
    discovery: ['{instructions}', '{subject}', '{grade_clause}', '{table_of_contents}'],
    outline: ['{instructions}', '{subject}', '{grade_clause}', '{chapters_text}'],
    apply_review: ['{chapters_text}', '{outline_text}', '{feedback_text}'],
    generate: ['{instructions}', '{subject}', '{grade_clause}', '{outline_text}', '{chapters_text}'],
  },
}

export function LLMConfigPage() {
  const { show } = useToast()
  const [configs, setConfigs] = useState<ConfigMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get<ConfigMap>('/api/v1/admin/llm-config')
      setConfigs(data)
    } catch (e) {
      setError(apiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const configEntries = Object.entries(configs).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div>
      <PageHeader
        title="LLM Configuration"
        description="Manage AI prompt templates and model settings used across workflows"
        actions={
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="text-muted" />
        </div>
      ) : configEntries.length === 0 ? (
        <div className="rounded-xl border border-border-light bg-slate-50/60 px-6 py-16 text-center">
          <Cpu size={40} className="mx-auto mb-3 text-muted" />
          <p className="text-sm text-muted">No LLM configurations found in the database.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {configEntries.map(([key, cfg]) => (
            <ConfigSection
              key={key}
              configKey={key}
              config={cfg}
              expanded={expandedKey === key}
              onToggle={() => setExpandedKey(expandedKey === key ? null : key)}
              onSave={async (updated) => {
                try {
                  const { data } = await api.put<LLMConfigDoc>(
                    `/api/v1/admin/llm-config/${key}`,
                    updated,
                  )
                  setConfigs((prev) => ({ ...prev, [key]: data }))
                  show('Configuration saved', 'success')
                } catch (e) {
                  show(apiErrorMessage(e), 'error')
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ConfigSection({
  configKey,
  config,
  expanded,
  onToggle,
  onSave,
}: {
  configKey: string
  config: LLMConfigDoc
  expanded: boolean
  onToggle: () => void
  onSave: (updated: Partial<LLMConfigDoc>) => Promise<void>
}) {
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [activePrompt, setActivePrompt] = useState<string | null>(null)

  useEffect(() => {
    if (expanded && config.prompts) {
      setEditedPrompts({ ...config.prompts })
      const keys = Object.keys(config.prompts)
      if (keys.length > 0 && !activePrompt) {
        setActivePrompt(keys[0])
      }
    }
  }, [expanded, config.prompts])

  const promptKeys = Object.keys(config.prompts || {})
  const placeholdersByPrompt = PLACEHOLDER_DOCS[configKey] || {}

  const hasChanges = Object.entries(editedPrompts).some(
    ([k, v]) => v !== (config.prompts?.[k] ?? ''),
  )

  async function handleSave() {
    setSaving(true)
    await onSave({ prompts: editedPrompts })
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-border-light bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/80"
      >
        {expanded ? (
          <ChevronDown size={18} className="shrink-0 text-muted" />
        ) : (
          <ChevronRight size={18} className="shrink-0 text-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-brand-slate">{config.label}</span>
            <Badge variant="neutral">{configKey}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted">{config.description}</p>
        </div>
        <span className="shrink-0 text-xs text-muted">
          {promptKeys.length} prompt{promptKeys.length !== 1 ? 's' : ''}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border-light">
          {/* Prompt tabs */}
          {promptKeys.length > 1 && (
            <div className="flex gap-0 overflow-x-auto border-b border-border-light bg-slate-50/60 px-5">
              {promptKeys.map((pk) => (
                <button
                  key={pk}
                  type="button"
                  onClick={() => setActivePrompt(pk)}
                  className={cn(
                    'whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors',
                    activePrompt === pk
                      ? 'border-brand-sky text-brand-slate'
                      : 'border-transparent text-muted hover:text-brand-slate',
                  )}
                >
                  {formatPromptKey(pk)}
                </button>
              ))}
            </div>
          )}

          {/* Active prompt editor */}
          {activePrompt && editedPrompts[activePrompt] !== undefined && (
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-brand-slate">
                  {formatPromptKey(activePrompt)}
                </label>
                {(placeholdersByPrompt[activePrompt] || []).length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Info size={12} />
                    <span>Placeholders: {placeholdersByPrompt[activePrompt].join(', ')}</span>
                  </div>
                )}
              </div>
              <textarea
                value={editedPrompts[activePrompt]}
                onChange={(e) =>
                  setEditedPrompts((prev) => ({ ...prev, [activePrompt]: e.target.value }))
                }
                className="w-full rounded-lg border border-border bg-slate-50/60 px-4 py-3 font-mono text-sm leading-relaxed text-brand-slate shadow-sm outline-none focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/30"
                rows={Math.min(Math.max(editedPrompts[activePrompt].split('\n').length + 2, 10), 30)}
                spellCheck={false}
              />
            </div>
          )}

          {/* Save bar */}
          <div className="flex items-center justify-between border-t border-border-light bg-slate-50/40 px-5 py-3">
            <span className="text-xs text-muted">
              {hasChanges ? 'You have unsaved changes' : 'No changes'}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatPromptKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
