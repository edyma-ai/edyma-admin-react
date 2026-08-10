export type AssessmentStatus = 'draft' | 'published'
export type QuestionType = 'file_upload' | 'text' | 'mcq_single' | 'mcq_multiple'
/** Provenance tag — absent on legacy docs, treated as 'manual'. */
export type QuestionSource = 'manual' | 'ai' | 'paper' | 'ai_edited'

export interface QuestionOption {
  id: string
  text: string
}

export interface Question {
  id: string
  type: QuestionType
  text: string
  options?: QuestionOption[] | null
  correct_options?: string[] | null
  expected_answer?: string | null
  source?: QuestionSource | null
  /** Populated by the profiler background job after publish (AI contract — opaque here). */
  question_profile?: Record<string, unknown> | null
}

export interface Assessment {
  id: string
  title: string
  description: string | null
  /** Derived server-side from the subject's class; not stored. */
  class_id?: string | null
  subject_id: string
  chapter_id?: string | null
  section_ids: string[]
  due_date: number | null
  status: AssessmentStatus
  created_by: string
  created_at: number
  updated_at: number
  questions: Question[]
}

export interface QuestionCreateBody {
  id?: string | null
  type: QuestionType
  text: string
  options?: QuestionOption[] | null
  correct_options?: string[] | null
  expected_answer?: string | null
  source?: QuestionSource | null
}

/** POST /assessments. */
export interface AssessmentCreateBody {
  title: string
  description?: string | null
  subject_id: string
  chapter_id: string
  section_ids: string[]
  due_date?: number | null
  status?: AssessmentStatus
  questions?: QuestionCreateBody[]
}

/** PUT /assessments/{id}. */
export interface AssessmentUpdateBody {
  title?: string
  description?: string | null
  chapter_id?: string
  due_date?: number | null
  status?: AssessmentStatus
  questions?: QuestionCreateBody[]
}

/**
 * GET /assessments/{id}/submissions and /evaluations return serialized RAW
 * docs — core fields typed, the rest accessible but untyped.
 */
export interface SubmissionDoc {
  id: string
  assessment_id: string
  student_id: string
  section_id?: string | null
  created_at: number
  updated_at: number
  [key: string]: unknown
}

/** Lifecycle of the evaluation background job (app/static/enums.py EvaluationJobStatus). */
export type EvaluationJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface EvaluationDoc {
  id: string
  assessment_id: string
  student_id: string
  /** null on the overall evaluation, set on per-question rows. */
  question_id?: string | null
  overall_score?: number | null
  job_status?: EvaluationJobStatus
  /** Display name resolved server-side (additive) — null when the account is gone; fall back to a client-side lookup. */
  student_name?: string | null
  /** Assessment title resolved server-side (additive). */
  assessment_title?: string | null
  created_at: number
  updated_at: number
  [key: string]: unknown
}

/* ── Paper extraction (`/assessments/paper-extractions`) ───────────── */

export type PaperExtractionStatus = 'queued' | 'running' | 'succeeded' | 'failed'
export type PaperExtractionStage = 'downloading' | 'extracting' | 'parsing' | 'done' | 'failed'

export interface PaperExtractionProgress {
  stage: PaperExtractionStage
  message: string
  done?: number | null
  total?: number | null
}

export interface PaperExtractionCreateBody {
  /** One S3 key per page, from /files/presign-upload with purpose='paper_extraction'. */
  s3_keys: string[]
  subject?: string | null
  grade_level?: string | null
}

/** Per-page outcome on a finished job — `notes` carries LLM commentary (e.g. skipped diagram questions). */
export interface PaperExtractionPageStatus {
  page_index: number
  status: 'ok' | 'failed' | string
  question_count: number
  error?: string | null
  notes?: string | null
}

export interface PaperExtractionJob {
  id: string
  created_by: string
  s3_keys: string[]
  status: PaperExtractionStatus
  progress?: PaperExtractionProgress | null
  subject?: string | null
  grade_level?: string | null
  /** Populated only once status='succeeded'; `source: 'paper'` is baked in server-side. */
  extracted_questions: QuestionCreateBody[]
  per_page_status: PaperExtractionPageStatus[]
  error_message?: string | null
  created_at: number
  updated_at: number
}
