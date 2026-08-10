import type { WhatsappTemplate } from '@/types/parentComms'

/**
 * Pure helpers behind the "pick an approved template and fill it in" form.
 *
 * Shared by the notice screen and the inbox, which needs the same thing once a
 * parent's 24-hour window has closed. Both derive their fields from the
 * catalogue rather than a hardcoded list, so a template added to the backend
 * fixture appears in both places without a frontend release.
 */

/** Turn `what_is_affected` into `What is affected` for a form label. */
export function humanise(name: string): string {
  const words = name.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Only the parameters a human supplies; the rest are filled per student. */
export function adminFields(template: WhatsappTemplate | undefined) {
  return (template?.parameters ?? []).filter((parameter) => parameter.source === 'admin')
}

/** The message as the parent will read it, with the typed values in place. */
export function previewBody(template: WhatsappTemplate, values: Record<string, string>): string {
  const body = template.content[template.default_language]?.body ?? ''
  return template.parameters.reduce(
    (text, parameter, index) => text.replaceAll(`{{${index + 1}}}`, values[parameter.name]?.trim() || `[${humanise(parameter.name).toLowerCase()}]`),
    body,
  )
}

export function allFilled(template: WhatsappTemplate | undefined, values: Record<string, string>): boolean {
  return adminFields(template).every((parameter) => (values[parameter.name] ?? '').trim().length > 0)
}

/** Only the admin-supplied values, trimmed - the server rejects anything else. */
export function submittableValues(template: WhatsappTemplate, values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(adminFields(template).map((parameter) => [parameter.name, (values[parameter.name] ?? '').trim()]))
}
