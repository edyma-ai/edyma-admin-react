import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Handshake, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { usePlans } from '@/api/queries/plans'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Stepper } from '@/components/ui/Stepper'
import { EMAIL_RE } from '@/lib/validation'
import type { Lead } from '@/types/leads'
import { ManagerStep } from '@/features/hq/onboarding/ManagerStep'
import { PlanStep } from '@/features/hq/onboarding/PlanStep'
import { ReviewStep } from '@/features/hq/onboarding/ReviewStep'
import { SchoolStep } from '@/features/hq/onboarding/SchoolStep'
import { SectionsStep } from '@/features/hq/onboarding/SectionsStep'
import { useWizardExecutor } from '@/features/hq/onboarding/useWizardExecutor'
import { emptyDraft, type ManagerDraft, type SchoolDraft, type SectionDraft, type WizardDraft } from '@/features/hq/onboarding/wizardModel'

const STEPS = [{ label: 'School' }, { label: 'Plan' }, { label: 'Sections' }, { label: 'Manager' }, { label: 'Review' }] as const

/** Guided school onboarding: profile → plan → sections → manager → review-and-create. super_admin only; sales gets a hand-off notice. */
export function SchoolWizardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const lead = (useLocation().state as { lead?: Lead } | null)?.lead

  const [draft, setDraft] = useState<WizardDraft>(() => emptyDraft(lead))
  const [step, setStep] = useState(0)
  const { state, run } = useWizardExecutor()
  const plans = usePlans()

  const planName = useMemo(() => plans.data?.find((plan) => plan.id === draft.planId)?.name ?? null, [plans.data, draft.planId])

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader breadcrumbs={[{ label: 'Schools', to: '/schools' }, { label: 'New school' }]} title="New school" />
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="School creation is a super-admin action"
            description="You can qualify the lead, log notes and mark it converted, then hand it to a super admin, who onboards the school here in one guided flow."
            action={
              <Button variant="secondary" icon={<Handshake className="h-4 w-4" />} onClick={() => navigate('/leads')}>
                Back to leads
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  // The draft feeds retries, so a step locks once ITS resource has been created —
  // editing it would desync the retry. Steps whose resources don't exist yet stay
  // editable after a failure (e.g. fix a duplicate manager email, then retry).
  const busy = state.running || state.finished
  const stepLocked = [
    busy || state.schoolId !== null,
    busy || state.subscriptionDone,
    busy || Object.keys(state.createdSections).length > 0,
    busy || state.managerId !== null,
    false,
  ]
  const allLocked = stepLocked.slice(0, 4).every(Boolean)

  function patchSchoolDraft(patch: Partial<SchoolDraft>) {
    setDraft((prev) => ({ ...prev, school: { ...prev.school, ...patch } }))
  }
  function patchManager(patch: Partial<ManagerDraft>) {
    setDraft((prev) => ({ ...prev, manager: { ...prev.manager, ...patch } }))
  }
  function patchSections(patch: { sections?: SectionDraft[]; academicYearId?: string }) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  const stepValid = [
    draft.school.name.trim().length > 0,
    true,
    draft.sections.length === 0 || Boolean(draft.academicYearId),
    draft.manager.displayName.trim().length > 0 && EMAIL_RE.test(draft.manager.email.trim()) && draft.manager.password.length >= 8,
    true,
  ][step]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Schools', to: '/schools' }, { label: 'New school' }]}
        title="New school"
        description="Five steps: profile, plan, sections, manager account, then one reviewed creation run."
      />

      {lead ? (
        <Card padded={false} className="border-sky/40 bg-sky-soft/40 px-4 py-2.5">
          <p className="text-[13px] text-ink">
            <span className="font-semibold">Prefilled from lead</span>
            <span className="text-muted">
              {': '}
              {lead.school_name}
              {lead.contact_name ? `, contact ${lead.contact_name}` : ''} ({lead.email})
            </span>
          </p>
        </Card>
      ) : null}

      <Stepper
        steps={[...STEPS]}
        current={step}
        onStepSelect={allLocked ? undefined : (index) => (stepLocked[index] ? undefined : setStep(index))}
        className="max-w-3xl"
      />

      <div className="min-h-72">
        {step === 0 ? <SchoolStep school={draft.school} onChange={patchSchoolDraft} /> : null}
        {step === 1 ? <PlanStep planId={draft.planId} onSelect={(planId) => setDraft((prev) => ({ ...prev, planId }))} /> : null}
        {step === 2 ? <SectionsStep sections={draft.sections} academicYearId={draft.academicYearId} onChange={patchSections} /> : null}
        {step === 3 ? <ManagerStep manager={draft.manager} onChange={patchManager} /> : null}
        {step === 4 ? <ReviewStep draft={draft} planName={planName} state={state} onRun={() => void run(draft)} /> : null}
      </div>

      {step < 4 ? (
        <div className="flex items-center gap-2 border-t border-hairline pt-4">
          {step > 0 ? (
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : null}
          <Button icon={<ArrowRight className="h-4 w-4" />} disabled={!stepValid} onClick={() => setStep(step + 1)}>
            {step === 3 ? 'Review' : 'Next'}
          </Button>
        </div>
      ) : !stepLocked[3] ? (
        <div className="flex items-center gap-2 border-t border-hairline pt-4">
          <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(3)}>
            Back
          </Button>
        </div>
      ) : null}
    </div>
  )
}
