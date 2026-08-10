export interface TlmSection {
  heading: string
  content: string
}

export interface TlmComment {
  section_heading: string
  user_comment: string
}

export interface TlmSubjectInput {
  subject_id: string
  chapter_ids: string[]
}

export interface TlmModule {
  prompt?: string | null
  comments: TlmComment[]
  sections: TlmSection[]
  created_at: number
  updated_at: number
}

export interface Tlm {
  id: string
  title: string
  section_ids: string[]
  subjects: TlmSubjectInput[]
  status: string
  modules: TlmModule[]
  created_by: string
  created_at: number
  updated_at: number
}

/** POST /tlm-modules. */
export interface TlmCreateBody {
  title?: string | null
  section_ids: string[]
  subjects: TlmSubjectInput[]
  prompt?: string | null
}

/* ── Generation jobs (`/tlm-modules/jobs`) ─────────────────────────── */

export type TlmGenerationJobStatus = 'queued' | 'running' | 'succeeded' | 'failed'
/** Which half of the TLM workflow the job runs. */
export type TlmGenerationJobStage = 'outline' | 'final'

/** GET /tlm-modules/jobs/{job_id} — polled while queued/running. */
export interface TlmGenerationJob {
  id: string
  stage: TlmGenerationJobStage
  status: TlmGenerationJobStatus
  /** Human-readable progress line for the polling UI. */
  progress_message?: string | null
  /** Set from creation for stage='final'; for stage='outline' populated only once status='succeeded'. */
  tlm_id?: string | null
  error_message?: string | null
  created_by: string
  created_at: number
  updated_at: number
}

/** 201 envelope from POST /tlm-modules/jobs and /tlm-modules/{id}/generate-final/jobs. */
export interface TlmGenerationJobCreated {
  job_id: string
  status: TlmGenerationJobStatus
}

/** POST /tlm-modules/{id}/comments. */
export interface TlmAddCommentBody {
  section_heading: string
  comment: string
}

/** DELETE /tlm-modules/{id}/comments. */
export interface TlmRemoveCommentBody {
  section_heading: string
}
