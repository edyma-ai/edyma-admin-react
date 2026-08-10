import type { Timestamped } from '@/types/common'

/**
 * Admin school routes (`/admin/schools*`) return the serialized RAW Mongo doc
 * (`_id` → `id`, ms-epoch ints, soft-delete flag) — not the public SchoolResponse.
 */
export interface School extends Timestamped {
  id: string
  name: string
  address?: string | null
  city?: string | null
  country?: string | null
  logo_url?: string | null
  logo_url_dark?: string | null
  school_manager_id?: string | null
  feature_flags?: Record<string, boolean> | null
  /** 'school' = institutional customer; 'retail' = the Edyma Academy virtual school. */
  plan_type?: string
  is_deleted: boolean
}

/** GET /schools/me and PATCH /schools/{id} — the public SchoolResponse model. */
export interface SchoolProfile {
  id: string
  name: string
  logo_url?: string | null
  logo_url_dark?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  feature_flags?: Record<string, boolean> | null
  plan_type: string
}

/** POST /admin/schools. */
export interface SchoolCreateBody {
  name: string
  address?: string | null
  city?: string | null
  country?: string | null
  logo_url?: string | null
  logo_url_dark?: string | null
  school_manager_id?: string | null
  feature_flags?: Record<string, boolean> | null
}

/** PATCH /admin/schools/{id} — all optional; also the shape for PATCH /schools/{id} (minus manager). */
export type SchoolUpdateBody = Partial<SchoolCreateBody>
