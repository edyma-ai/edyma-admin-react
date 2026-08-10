import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Minus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CopyField } from '@/components/ui/CopyField'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { sectionKey, type WizardDraft } from '@/features/hq/onboarding/wizardModel'
import type { WizardRunState, WizardStepKey } from '@/features/hq/onboarding/useWizardExecutor'

type ItemStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error'

const RUN_ORDER: WizardStepKey[] = ['school', 'subscription', 'sections', 'manager']

function deriveStatuses(draft: WizardDraft, state: WizardRunState): Record<WizardStepKey, ItemStatus> {
  const complete: Record<WizardStepKey, boolean> = {
    school: Boolean(state.schoolId),
    subscription: !draft.planId || state.subscriptionDone,
    sections: draft.sections.every((section) => state.createdSections[sectionKey(section)]),
    manager: Boolean(state.managerId && state.managerLinked),
  }
  const firstIncomplete = RUN_ORDER.find((key) => !complete[key]) ?? null

  return Object.fromEntries(
    RUN_ORDER.map((key) => {
      if (state.failure?.step === key && !complete[key]) return [key, 'error']
      if (complete[key]) {
        const skipped = (key === 'subscription' && !draft.planId) || (key === 'sections' && draft.sections.length === 0)
        return [key, skipped ? 'skipped' : 'done']
      }
      return [key, state.running && key === firstIncomplete ? 'running' : 'pending']
    }),
  ) as Record<WizardStepKey, ItemStatus>
}

function StatusMarker({ status }: { status: ItemStatus }) {
  if (status === 'running') return <Spinner size="sm" />
  if (status === 'done')
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
        <Check aria-hidden className="h-3 w-3" />
      </span>
    )
  if (status === 'error')
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white">
        <AlertTriangle aria-hidden className="h-3 w-3" />
      </span>
    )
  if (status === 'skipped')
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink/10 text-muted dark:bg-white/10">
        <Minus aria-hidden className="h-3 w-3" />
      </span>
    )
  return <span className="h-5 w-5 rounded-full border-2 border-hairline" />
}

export interface ReviewStepProps {
  draft: WizardDraft
  planName: string | null
  state: WizardRunState
  onRun: () => void
}

/** Step 5 — review the draft, then execute school → subscription → sections → manager with per-step progress and retry. */
export function ReviewStep({ draft, planName, state, onRun }: ReviewStepProps) {
  const navigate = useNavigate()
  const statuses = deriveStatuses(draft, state)
  const createdSectionCount = draft.sections.filter((section) => state.createdSections[sectionKey(section)]).length
  const started = state.running || state.schoolId !== null

  const items: { key: WizardStepKey; title: string; detail: string }[] = [
    { key: 'school', title: 'Create school', detail: [draft.school.name.trim(), draft.school.city.trim()].filter(Boolean).join(', ') },
    { key: 'subscription', title: 'Activate subscription', detail: draft.planId ? (planName ?? draft.planId) : 'Skipped. Attach a plan later from the Plan & features tab' },
    {
      key: 'sections',
      title: 'Create sections',
      detail:
        draft.sections.length === 0
          ? 'Skipped (none queued)'
          : started
            ? `${createdSectionCount} of ${draft.sections.length} created`
            : `${draft.sections.length} queued: ${draft.sections.map((section) => section.label).join(', ')}`,
    },
    { key: 'manager', title: 'Create manager account', detail: `${draft.manager.displayName.trim()} <${draft.manager.email.trim()}>` },
  ]

  if (state.finished && state.schoolId) {
    return (
      <div className="flex max-w-xl flex-col gap-5">
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="text-lg font-extrabold tracking-tight text-ink">{draft.school.name.trim()} is live</p>
          <p className="max-w-sm text-[13px] text-muted">
            {draft.planId ? 'Subscription active, ' : ''}
            {draft.sections.length > 0 ? `${draft.sections.length} section${draft.sections.length === 1 ? '' : 's'} ready, ` : ''}
            manager account created.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Button icon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate(`/schools/${state.schoolId}`)}>
              Open school
            </Button>
            <Button variant="secondary" icon={<Upload className="h-4 w-4" />} onClick={() => navigate(`/schools/${state.schoolId}/import`)}>
              Import users from CSV
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 border-warning/40 bg-warning-soft/40">
          <p className="text-[13px] font-semibold text-warning">Hand these over now. The password is never shown again.</p>
          <CopyField label="Manager login" value={draft.manager.email.trim()} />
          <CopyField label="Manager password" value={draft.manager.password} />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <ol className="overflow-hidden rounded-card border border-hairline bg-surface">
        {items.map((item) => {
          const status = statuses[item.key]
          return (
            <li key={item.key} className="flex items-start gap-3 border-b border-hairline px-4 py-3 last:border-b-0">
              <span className="mt-0.5 shrink-0">
                <StatusMarker status={status} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-[13px] font-semibold', status === 'skipped' ? 'text-muted' : 'text-ink')}>{item.title}</p>
                <p className="text-xs text-muted">{item.detail}</p>
                {status === 'error' && state.failure ? <p className="mt-1 text-xs font-medium text-danger">{state.failure.message}</p> : null}
              </div>
            </li>
          )
        })}
      </ol>

      {state.failure ? (
        <p className="text-[13px] text-muted">
          Everything already created stays in place. Retrying resumes at the first uncreated resource. Fix the cause first (e.g. go back to an earlier step
          and correct a duplicate email), then retry.
        </p>
      ) : null}

      <Button size="lg" className="self-start" loading={state.running} onClick={onRun}>
        {state.failure ? 'Retry from failed step' : started ? 'Resume setup' : 'Create school'}
      </Button>
    </div>
  )
}
