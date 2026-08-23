/**
 * Parent communication over WhatsApp - reports, inbox, broadcasts, delivery log.
 *
 * Mirrors `app/models/parent_comms.py`. Long-running actions return a job id
 * the console polls rather than blocking on the request.
 */

export type ParentLanguage = 'en' | 'hi' | 'pa'

export type MessageDirection = 'outbound' | 'inbound'

export type MessageKind = 'intro' | 'weekly_report' | 'monthly_report' | 'broadcast' | 'reply' | 'inbound'

/**
 * `queued → sending → sent` happens locally: a dispatch pass claims the row
 * before it calls Meta, which is what stops two overlapping passes messaging
 * the same parent. Everything after `sent` arrives asynchronously on the
 * webhook. `skipped` means we deliberately did not send (opted out, no number,
 * nothing to report) and carries the reason.
 */
export type MessageStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped'

export type PeriodType = 'weekly' | 'monthly'

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface ParentContact {
  student_id: string
  student_name: string
  school_id?: string | null
  parent_name?: string | null
  parent_whatsapp?: string | null
  parent_language: ParentLanguage
  parent_opted_out: boolean
  parent_intro_sent_at?: number | null
  parent_last_inbound_at?: number | null
}

export interface ParentContactUpdateBody {
  parent_name?: string | null
  parent_whatsapp?: string | null
  parent_language?: ParentLanguage
  parent_opted_out?: boolean
}

export interface MediaAttachment {
  s3_key: string
  media_id?: string | null
  mime: string
  filename: string
  caption?: string | null
}

export interface ParentMessage {
  id: string
  student_id?: string | null
  school_id?: string | null
  parent_whatsapp?: string | null
  direction: MessageDirection
  kind: MessageKind
  language?: ParentLanguage | null
  body_text?: string | null
  media?: MediaAttachment | null
  status: MessageStatus
  error_code?: string | null
  error_message?: string | null
  batch_id?: string | null
  created_at: number
  sent_at?: number | null
  delivered_at?: number | null
  read_at?: number | null
}

export interface ParentThread {
  student_id: string
  student_name: string
  school_id?: string | null
  parent_name?: string | null
  parent_whatsapp: string
  parent_language: ParentLanguage
  last_message_at: number
  last_message_preview: string
  last_inbound_at?: number | null
  unread_count: number
  /** WhatsApp only allows free-form replies for 24h after the parent writes. */
  window_expires_at?: number | null
  window_open: boolean
}

export interface BatchCounts {
  queued: number
  sending: number
  sent: number
  delivered: number
  read: number
  failed: number
  skipped: number
}

export interface ParentBatch {
  id: string
  kind: MessageKind
  period_key?: string | null
  counts: BatchCounts
  body_text?: string | null
  created_by?: string | null
  created_at: number
}

export interface ParentCommsJob {
  id: string
  kind: string
  status: JobStatus
  progress: { total: number; done: number }
  batch_id?: string | null
  error_message?: string | null
  created_at: number
  updated_at: number
}

export interface GeneratedPeriod {
  period_key: string
  period_start_ms?: number | null
  generated: number
  published: number
  fully_published: boolean
}

/** What publishing one report would do. Mirrors `service._send_outlook`. */
export type SendOutlook = 'send' | 'skip' | 'already_sent'

export interface PeriodReportRow {
  student_id: string
  student_name: string
  parent_name?: string | null
  parent_whatsapp?: string | null
  language: ParentLanguage
  active_days: number
  days_in_period: number
  minutes_spent: number
  has_activity: boolean
  outlook: SendOutlook
  skip_reason?: string | null
  /** The exact text this parent would receive, so the review is of the
   *  message rather than of a summary of it. */
  body_text?: string | null
  published_at?: number | null
}

export interface PeriodReports {
  period_type: PeriodType
  period_key: string
  counts: { generated: number; send: number; skip: number; already_sent: number }
  /** How many skips fall under each reason, so the count is explainable. */
  skip_reasons: Record<string, number>
  distinct_parents: number
  reports: PeriodReportRow[]
}

export interface ReportsPreview {
  period_type: PeriodType
  period_key: string
  period_start_ms: number
  period_end_ms: number
  /** Standing headcount of students with a usable parent number. Not what a
   *  publish will send - use `will_send` for that. */
  contactable_students: number
  generated: number
  will_send: number
  will_skip: number
  already_sent: number
  distinct_parents: number
  /** Publishing is refused without an approved WhatsApp template, so the page
   *  blocks on this rather than letting the admin discover it via a 422. */
  template_ready: boolean
  template_name?: string | null
  template_blocker?: string | null
}

export type AudienceType = 'school' | 'section' | 'students'

export interface Audience {
  type: AudienceType
  school_id?: string | null
  section_ids?: string[]
  student_ids?: string[]
}

/** Who supplies one template parameter. Only `admin` ones get a form field. */
export type ParameterSource = 'admin' | 'computed' | 'rendered'

export interface TemplateParameter {
  name: string
  description: string
  example: string
  source: ParameterSource
}

export interface TemplateContent {
  header?: string | null
  body: string
  footer?: string | null
}

/**
 * One entry of `whatsapp_templates_md`, the approved copy catalogue.
 *
 * The form is built from this rather than hardcoded, so a template added to
 * the backend fixture appears here without a frontend release.
 */
export interface WhatsappTemplate {
  _id: string
  code: string
  meta_name?: string | null
  requires_meta_approval: boolean
  admin_selectable: boolean
  default_language: ParentLanguage
  /** IMAGE / VIDEO: the file is supplied per send and travels inside the message (JPEG/PNG; MP4/3GPP). */
  header_format: 'TEXT' | 'IMAGE' | 'VIDEO'
  header_parameters: TemplateParameter[]
  parameters: TemplateParameter[]
  buttons: ParentLanguage[]
  content: Partial<Record<ParentLanguage, TemplateContent>>
}

export interface BroadcastBody {
  audience: Audience
  template_code: string
  /** Only the parameters a human supplies; the rest are filled per student. */
  parameters: Record<string, string>
  media?: MediaAttachment | null
}

export interface JobStartResponse {
  job_id: string
  batch_id?: string | null
}
