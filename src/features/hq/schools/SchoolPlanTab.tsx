import { useMemo, useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { usePlans, useSchoolEntitlements, useSetSchoolSubscription } from '@/api/queries/plans'
import { useUpdateSchool } from '@/api/queries/schools'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { formatInr } from '@/lib/format'
import type { Plan, SchoolEntitlements } from '@/types/plans'
import type { School } from '@/types/schools'
import { PlanBadge } from '@/features/hq/shared/PlanBadge'
import { Widget } from '@/features/hq/shared/Widget'

type OverrideChoice = 'default' | 'on' | 'off'

/** Everything the tab needs from the school — lets School OS mount it from /schools/me data. */
type SchoolRef = Pick<School, 'id' | 'name'>

const OVERRIDE_OPTIONS = [
  { value: 'default', label: 'Plan default' },
  { value: 'on', label: 'Force on' },
  { value: 'off', label: 'Force off' },
]

function featureLabel(key: string): string {
  return key.replace(/_/g, ' ')
}

function draftFromOverrides(overrides: Record<string, boolean>): Record<string, OverrideChoice> {
  return Object.fromEntries(Object.entries(overrides).map(([key, forced]) => [key, forced ? 'on' : 'off']))
}

function describeChoice(choice: OverrideChoice): string {
  if (choice === 'on') return 'forced on'
  if (choice === 'off') return 'forced off'
  return 'plan default'
}

function SubscriptionPanel({ school, entitlements, plans, canManage }: { school: SchoolRef; entitlements: SchoolEntitlements; plans: Plan[]; canManage: boolean }) {
  const toast = useToast()
  const setSubscription = useSetSchoolSubscription(school.id)
  const [planId, setPlanId] = useState(entitlements.plan_id ?? '')

  const subscription = entitlements.subscription

  async function applyPlan() {
    if (!planId) return
    try {
      await setSubscription.mutateAsync({ plan_id: planId, status: 'active' })
      toast.show('Subscription updated')
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-x-10 gap-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Plan</p>
          <p className="mt-1 flex items-center gap-2 text-[15px] font-bold text-ink">
            {entitlements.plan_name ?? 'No plan'}
            <PlanBadge planType={entitlements.plan_type} />
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Subscription</p>
          <p className="mt-1.5">
            {subscription ? (
              <Badge tone={subscription.status === 'active' ? 'success' : 'neutral'}>{subscription.status}</Badge>
            ) : (
              <Badge tone="neutral">None (plan defaults apply)</Badge>
            )}
          </p>
        </div>
        {subscription ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Price</p>
            <p className="mt-1 font-mono text-[15px] font-semibold text-ink">
              {subscription.price_inr != null ? formatInr(subscription.price_inr) : 'Catalog price'}
              {subscription.billing_cycle ? <span className="font-sans text-xs font-medium text-muted"> / {subscription.billing_cycle}</span> : null}
            </p>
          </div>
        ) : null}
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-end gap-3 border-t border-hairline pt-4">
          <Select
            label="Change plan"
            className="w-72"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            placeholder="Pick a plan"
            options={plans.map((plan) => ({ value: plan.id, label: `${plan.name} · ${formatInr(plan.price_inr)} ${plan.billing_cycle}` }))}
          />
          <Button onClick={applyPlan} loading={setSubscription.isPending} disabled={!planId || planId === entitlements.plan_id}>
            Apply plan
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function FeatureMatrix({ school, entitlements, catalog, canEdit }: { school: SchoolRef; entitlements: SchoolEntitlements; catalog: string[]; canEdit: boolean }) {
  const toast = useToast()
  const updateSchool = useUpdateSchool(school.id)
  // Only user edits live in state; the draft is derived from the server overrides, so refetches never go stale.
  const [edits, setEdits] = useState<Record<string, OverrideChoice>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  const features = useMemo(() => {
    const keys = new Set([...catalog, ...entitlements.base_features, ...entitlements.effective_features, ...Object.keys(entitlements.overrides)])
    return [...keys].sort()
  }, [catalog, entitlements])

  const saved = useMemo(() => draftFromOverrides(entitlements.overrides), [entitlements.overrides])
  const draft: Record<string, OverrideChoice> = { ...saved, ...edits }
  const changes = features.filter((key) => (draft[key] ?? 'default') !== (saved[key] ?? 'default'))

  function isEffective(key: string): boolean {
    const choice = draft[key] ?? 'default'
    if (choice !== 'default') return choice === 'on'
    return entitlements.base_features.includes(key)
  }

  async function saveOverrides() {
    const flags: Record<string, boolean> = {}
    for (const [key, choice] of Object.entries(draft)) {
      if (choice !== 'default') flags[key] = choice === 'on'
    }
    try {
      await updateSchool.mutateAsync({ feature_flags: flags })
      toast.show('Feature overrides applied')
      setEdits({})
      setConfirmOpen(false)
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  const rowGrid = 'grid grid-cols-[minmax(0,1fr)_6.5rem_10rem_5.5rem] items-center gap-x-4'

  return (
    <div className="flex flex-col">
      <div className={`${rowGrid} border-b border-hairline pb-2 text-[11px] font-bold uppercase tracking-wide text-muted`}>
        <span>Feature</span>
        <span>Base plan</span>
        <span>Override</span>
        <span>Effective</span>
      </div>
      {features.map((key) => {
        const inPlan = entitlements.base_features.includes(key)
        const choice = draft[key] ?? 'default'
        const active = isEffective(key)
        return (
          <div key={key} className={`${rowGrid} border-b border-hairline py-2.5 last:border-b-0`}>
            <span className="truncate text-[13px] font-medium capitalize text-ink">{featureLabel(key)}</span>
            <span>
              <Badge tone={inPlan ? 'sky' : 'neutral'}>{inPlan ? 'In plan' : 'Not in plan'}</Badge>
            </span>
            <span>
              {canEdit ? (
                <Select
                  aria-label={`Override for ${featureLabel(key)}`}
                  value={choice}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value as OverrideChoice }))}
                  options={OVERRIDE_OPTIONS}
                  className="w-36"
                />
              ) : (
                <Badge tone={choice === 'default' ? 'neutral' : choice === 'on' ? 'success' : 'danger'}>
                  {choice === 'default' ? '—' : choice === 'on' ? 'Forced on' : 'Forced off'}
                </Badge>
              )}
            </span>
            <span>
              <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Off'}</Badge>
            </span>
          </div>
        )
      })}

      {canEdit ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">Overrides sit on top of the plan and take effect immediately.</p>
          <Button disabled={changes.length === 0} onClick={() => setConfirmOpen(true)}>
            Save overrides
          </Button>
        </div>
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        size="sm"
        title="Apply feature overrides?"
        description={`These changes go live immediately for everyone at ${school.name}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button loading={updateSchool.isPending} onClick={saveOverrides}>
              Apply live
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-1.5">
          {changes.map((key) => (
            <li key={key} className="text-[13px] text-ink">
              <span className="font-medium capitalize">{featureLabel(key)}</span>
              <span className="text-muted">
                {': '}
                {describeChoice(saved[key] ?? 'default')} → {describeChoice(draft[key] ?? 'default')}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}

export function SchoolPlanTab({ school }: { school: SchoolRef }) {
  const { user } = useAuth()
  const entitlements = useSchoolEntitlements(school.id)
  const plans = usePlans()

  const canEditOverrides = user?.role === 'super_admin'
  const canManageSubscription = user?.role === 'super_admin' || user?.role === 'super_sales_manager'
  const catalog = useMemo(() => plans.data?.flatMap((plan) => plan.features) ?? [], [plans.data])

  return (
    <div className="flex flex-col gap-4">
      <Widget
        title="Plan & subscription"
        description="The active school-scope subscription drives the base feature set."
        query={entitlements}
        skeletonHeight={140}
      >
        {(data) => <SubscriptionPanel school={school} entitlements={data} plans={plans.data ?? []} canManage={canManageSubscription} />}
      </Widget>
      <Widget
        title="Features"
        description="Base plan features, per-school overrides and the effective result."
        query={entitlements}
        skeletonHeight={280}
      >
        {(data) => <FeatureMatrix school={school} entitlements={data} catalog={catalog} canEdit={canEditOverrides} />}
      </Widget>
    </div>
  )
}
