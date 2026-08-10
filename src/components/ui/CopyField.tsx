import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Field, fieldChrome } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'

export interface CopyFieldProps {
  label?: string
  value: string
  hint?: string
  className?: string
}

/** Read-only mono value with a copy button — one-time credentials, ids, deep links. */
export function CopyField({ label, value, hint, className }: CopyFieldProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* Clipboard unavailable (http origin) — the field is still selectable. */
    }
  }

  return (
    <Field label={label} hint={hint} className={className}>
      {({ id }) => (
        <div className="flex items-center gap-2">
          <input id={id} readOnly value={value} onFocus={(event) => event.currentTarget.select()} className={cn(fieldChrome(), 'h-9 flex-1 px-3 font-mono')} />
          <IconButton
            label={copied ? 'Copied' : 'Copy to clipboard'}
            variant="secondary"
            icon={copied ? <Check className="text-success" /> : <Copy />}
            onClick={copy}
          />
        </div>
      )}
    </Field>
  )
}
