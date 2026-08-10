import { Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { generatePassword } from '@/lib/password'
import type { ManagerDraft } from '@/features/hq/onboarding/wizardModel'

export interface ManagerStepProps {
  manager: ManagerDraft
  onChange: (patch: Partial<ManagerDraft>) => void
}

/** Step 4 — the school_manager account. The password is generated client-side and surfaced exactly once at the end. */
export function ManagerStep({ manager, onChange }: ManagerStepProps) {
  return (
    <div className="flex max-w-md flex-col gap-4">
      <Input label="Display name" required value={manager.displayName} onChange={(e) => onChange({ displayName: e.target.value })} placeholder="Asha Rao" />
      <Input
        label="Email"
        type="email"
        required
        value={manager.email}
        onChange={(e) => onChange({ email: e.target.value })}
        placeholder="principal@school.in"
        hint="This becomes their console login"
      />
      <div className="flex items-start gap-2">
        <Input
          label="Password"
          required
          mono
          value={manager.password}
          onChange={(e) => onChange({ password: e.target.value })}
          hint="Min 8 characters. Shown once with a copy button after creation"
          className="flex-1"
        />
        <Button variant="secondary" className="mt-[26px]" icon={<Wand2 className="h-4 w-4" />} onClick={() => onChange({ password: generatePassword() })}>
          Generate
        </Button>
      </div>
    </div>
  )
}
