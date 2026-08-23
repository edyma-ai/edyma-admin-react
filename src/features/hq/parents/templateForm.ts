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

/* ── Media headers ────────────────────────────────────────────────────── */

/**
 * What WhatsApp accepts per header format, mirrored from the backend's
 * MEDIA_HEADER_MIMES / MEDIA_UPLOAD_LIMITS so a wrong file is refused before
 * it is uploaded. WhatsApp has no GIF type: a GIF has to be exported as MP4.
 */
const MB = 1024 * 1024

export interface MediaHeaderRule {
  /** Native accept filter for the file input. */
  accept: string
  /** MIME types the backend will take for this header. */
  mimes: string[]
  /** WhatsApp's size cap for this kind of file. */
  maxBytes: number
  /** What the admin is asked for. */
  title: string
  hint: string
  noun: string
}

export const MEDIA_HEADER_RULES: Record<'IMAGE' | 'VIDEO', MediaHeaderRule> = {
  IMAGE: {
    accept: '.png,.jpg,.jpeg',
    mimes: ['image/jpeg', 'image/png'],
    maxBytes: 5 * MB,
    title: 'Choose the image (required)',
    hint: 'JPEG or PNG, under 5 MB. Sent inside the message, so it reaches every parent. GIFs are not accepted by WhatsApp',
    noun: 'image',
  },
  VIDEO: {
    accept: '.mp4,.3gp',
    mimes: ['video/mp4', 'video/3gpp'],
    maxBytes: 16 * MB,
    title: 'Choose the video (required)',
    hint: 'MP4 (or 3GP), under 16 MB. Sent inside the message, so it reaches every parent. A GIF must be exported as MP4 first',
    noun: 'video',
  },
}

/** The rule for a template's header, or null for a text header (attachments go as a follow-up). */
export function mediaHeaderRule(template: WhatsappTemplate | undefined): MediaHeaderRule | null {
  const format = template?.header_format
  return format === 'IMAGE' || format === 'VIDEO' ? MEDIA_HEADER_RULES[format] : null
}

/** Why a picked file cannot be this header's media, or null when it can. Checked before upload. */
export function mediaHeaderProblem(rule: MediaHeaderRule, file: File): string | null {
  const mime = (file.type || '').split(';')[0].trim().toLowerCase()
  if (!rule.mimes.includes(mime)) {
    if (mime === 'image/gif') return 'WhatsApp cannot send GIFs. Export it as an MP4 and send it as a video notice.'
    return `That is not a ${rule.noun} WhatsApp can deliver. ${rule.hint.split('.')[0]}.`
  }
  if (file.size > rule.maxBytes) return `${rule.noun === 'image' ? 'Images' : 'Videos'} must be under ${rule.maxBytes / MB} MB; this one is ${(file.size / MB).toFixed(1)} MB.`
  return null
}
