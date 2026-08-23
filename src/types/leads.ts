import type { PlanContext } from '@/types/auth'
import type { AccountKind } from '@/types/users'

export type LeadStatus = 'new' | 'contacted' | 'converted'
export type LeadKind = 'student' | 'school'
/** Where the lead came from: the website form, or a visitor who started exploring the app as a guest. */
export type LeadSource = 'form' | 'guest'

/** One entry of a lead's append-only notes timeline. */
export interface LeadNote {
  note: string
  created_by: string
  created_at: number
}

/** GET /leads — union of the student and school variants' fields. */
export interface Lead {
  id: string
  kind: LeadKind
  status: LeadStatus
  /** Absent on docs that predate guest access; treat that as 'form'. */
  source?: LeadSource
  phone: string
  /** Null on guest leads, where email is optional. */
  email: string | null
  board?: string | null
  city?: string | null
  /* Student variant */
  name?: string | null
  guardian_name?: string | null
  grade?: string | null
  /* Guest variant: the account the visitor is already using. */
  user_id?: string | null
  class_id?: string | null
  callback_requested_at?: number | null
  guest_expires_at?: number | null
  account_kind?: AccountKind | null
  /* School variant */
  school_name?: string | null
  contact_name?: string | null
  student_count_band?: string | null
  /** [] on docs that predate the notes field. */
  notes: LeadNote[]
  created_at: number
  updated_at?: number | null
}

/** PATCH /leads/{id}: advance status and/or append a note. */
export interface LeadUpdateBody {
  status?: LeadStatus
  note?: string
}

/** POST /admin/retail/activations. */
export interface RetailActivationBody {
  user_id: string
  /** Master class slug, e.g. 'class08'. */
  class_id: string
}

export interface RetailActivationResult {
  user_id: string
  school_id: string
  class_id: string
  section_id: string
  enrollment_id: string
  subscription_id: string
  plan_context: PlanContext
}
