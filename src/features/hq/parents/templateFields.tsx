import { Input } from '@/components/ui/Input'
import type { WhatsappTemplate } from '@/types/parentComms'
import { adminFields, humanise, previewBody } from '@/features/hq/parents/templateForm'

/** The form fields and preview for one approved template. */

export function TemplateFields({
  template,
  values,
  onChange,
}: {
  template: WhatsappTemplate
  values: Record<string, string>
  onChange: (name: string, value: string) => void
}) {
  const fields = adminFields(template)
  if (!fields.length) {
    return (
      <p className="text-[12px] text-muted">
        This notice fills itself in per student.
        {template.code === 'assignment_overdue' ? ' Only students with work past its due date are messaged.' : null}
      </p>
    )
  }
  return (
    <>
      {fields.map((parameter) => (
        <Input
          key={parameter.name}
          label={humanise(parameter.name)}
          value={values[parameter.name] ?? ''}
          onChange={(event) => onChange(parameter.name, event.target.value)}
          placeholder={parameter.example}
          hint={parameter.description}
        />
      ))}
    </>
  )
}

export function TemplatePreview({ template, values }: { template: WhatsappTemplate; values: Record<string, string> }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-muted">Preview ({template.default_language})</span>
      <pre className="whitespace-pre-wrap rounded-lg border border-hairline bg-surface-muted p-3 font-sans text-[13px]">{previewBody(template, values)}</pre>
    </div>
  )
}

/** Shown when a template exists in the catalogue but Meta has not approved it. */
export function UnapprovedTemplateWarning({ template }: { template: WhatsappTemplate }) {
  if (template.meta_name) return null
  return <p className="text-[12px] text-danger">This notice has no approved WhatsApp name yet, so it cannot be sent. Create it in WhatsApp Manager first.</p>
}
