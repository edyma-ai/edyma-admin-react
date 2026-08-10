import { Check, Clock } from 'lucide-react'
import { usePlans } from '@/api/queries/plans'
import { Badge } from '@/components/ui/Badge'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { apiErrorMessage } from '@/lib/apiError'
import { formatInr } from '@/lib/format'
import type { Plan } from '@/types/plans'

export interface PlanStepProps {
  planId: string
  onSelect: (planId: string) => void
}

function PlanCard({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: () => void }) {
  const isSchoolPlan = plan.plan_type === 'school'
  return (
    <button
      type="button"
      disabled={!isSchoolPlan}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'focus-ring flex flex-col gap-3 rounded-card border p-5 text-left transition-colors',
        selected ? 'border-sky bg-sky-soft/60 shadow-card' : 'border-hairline bg-surface hover:border-sky/40',
        !isSchoolPlan && 'pointer-events-none opacity-55',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[15px] font-bold text-ink">{plan.name}</p>
        {selected ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky text-white">
            <Check aria-hidden className="h-3 w-3" />
          </span>
        ) : null}
      </div>
      <p className="font-mono text-lg font-semibold text-ink">
        {plan.price_inr != null ? formatInr(plan.price_inr) : 'Custom pricing'}
        {plan.billing_cycle ? <span className="font-sans text-xs font-medium text-muted"> / {plan.billing_cycle}</span> : null}
      </p>
      <ul className="flex flex-col gap-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-1.5 text-[13px] capitalize text-muted">
            <Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-success" />
            {feature.replace(/_/g, ' ')}
          </li>
        ))}
      </ul>
      {!isSchoolPlan ? <Badge tone="warning">Retail students only</Badge> : null}
    </button>
  )
}

/** Step 2 — pick the plan whose subscription gets activated, or explicitly defer. */
export function PlanStep({ planId, onSelect }: PlanStepProps) {
  const plans = usePlans()

  if (plans.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    )
  }
  if (plans.isError) {
    return <ErrorState message={apiErrorMessage(plans.error)} onRetry={() => void plans.refetch()} />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(plans.data ?? []).map((plan) => (
        <PlanCard key={plan.id} plan={plan} selected={planId === plan.id} onSelect={() => onSelect(plan.id)} />
      ))}
      <button
        type="button"
        aria-pressed={planId === ''}
        onClick={() => onSelect('')}
        className={cn(
          'focus-ring flex flex-col items-start gap-3 rounded-card border border-dashed p-5 text-left transition-colors',
          planId === '' ? 'border-sky bg-sky-soft/60' : 'border-hairline bg-surface hover:border-sky/40',
        )}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-ink/5 text-muted dark:bg-white/10">
          <Clock aria-hidden className="h-4 w-4" />
        </span>
        <span className="text-[15px] font-bold text-ink">Decide later</span>
        <span className="text-[13px] text-muted">Create the school without a subscription. Attach one any time from its Plan &amp; features tab.</span>
      </button>
    </div>
  )
}
