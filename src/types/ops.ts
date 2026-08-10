import type { Timestamped } from '@/types/common'

/* ── LLM config (`/admin/llm-config`) — sanitized raw docs keyed by config_key ── */

export interface LlmConfigDoc {
  id: string
  config_key: string
  label: string
  description: string
  prompts: Record<string, string>
  model_id?: string
  scope_model_id?: string
  [key: string]: unknown
}

export type LlmConfigMap = Record<string, LlmConfigDoc>

/* ── RBAC admin (`/admin/roles|permissions|role-permissions`) — serialized raw docs ── */

export interface RoleDoc extends Timestamped {
  id: string
  name: string
  description?: string | null
  is_deleted: boolean
}

export interface PermissionApi {
  method: string
  path: string
}

export interface PermissionDoc extends Timestamped {
  id: string
  name: string
  description?: string | null
  apis: PermissionApi[]
  is_deleted: boolean
}

export interface RolePermissionDoc extends Timestamped {
  id: string
  role_name: string
  permission_name: string
  is_deleted: boolean
}

/** POST /admin/role-permissions. */
export interface RolePermissionCreateBody {
  role_name: string
  permission_name: string
}

/* ── Notifications + digests ───────────────────────────────────────── */

/** POST /notifications/admin/send. */
export interface AdminSendNotificationBody {
  title: string
  body: string
  roles: ('teacher' | 'student')[]
}

/** POST /digests/send-weekly. */
export interface DigestSendResponse {
  sent: number
  skipped: number
  errors: number
}

/* ── Files (`/files`) ──────────────────────────────────────────────── */

export interface PresignUploadBody {
  /** e.g. 'pdf' — leading dot is stripped server-side. */
  extension: string
  purpose?: 'submission' | 'avatar' | 'support' | 'paper_extraction'
}

export interface PresignUploadResponse {
  upload_url: string
  key: string
  expires_in: number
  content_type: string
}

export interface DownloadUrlResponse {
  download_url: string
  expires_in: number
}
