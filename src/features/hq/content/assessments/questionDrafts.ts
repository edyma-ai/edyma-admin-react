import type { QuestionCreateBody, QuestionOption, QuestionSource, QuestionType } from '@/types/assessments'

/** Local editing model for the question builder — keyed for stable list rendering. */
export interface QuestionDraft {
  key: string
  type: QuestionType
  text: string
  options: QuestionOption[]
  correctOptions: string[]
  expectedAnswer: string
  /** Provenance carried into the create body (paper-extracted questions keep 'paper'). */
  source: QuestionSource | null
}

const OPTION_IDS = 'abcdefghij'
export const MAX_OPTIONS = OPTION_IDS.length

export function isMcq(type: QuestionType): boolean {
  return type === 'mcq_single' || type === 'mcq_multiple'
}

function draftKey(): string {
  return crypto.randomUUID()
}

export function newQuestionDraft(type: QuestionType): QuestionDraft {
  return {
    key: draftKey(),
    type,
    text: '',
    options: isMcq(type) ? [{ id: 'a', text: '' }, { id: 'b', text: '' }] : [],
    correctOptions: [],
    expectedAnswer: '',
    source: null,
  }
}

/** Next free option id (a…j) — extraction can skip letters, so scan rather than count. */
export function nextOptionId(options: QuestionOption[]): string | null {
  const used = new Set(options.map((option) => option.id))
  for (const id of OPTION_IDS) if (!used.has(id)) return id
  return null
}

/** Paper-extraction rows arrive as ready QuestionCreateBody payloads (source='paper' baked in). */
export function draftFromExtracted(question: QuestionCreateBody): QuestionDraft {
  return {
    key: draftKey(),
    type: question.type,
    text: question.text,
    options: question.options ?? [],
    correctOptions: question.correct_options ?? [],
    expectedAnswer: question.expected_answer ?? '',
    source: question.source ?? 'paper',
  }
}

/** Mirrors the server-side QuestionCreate validator so publish never round-trips a 422. */
export function draftError(draft: QuestionDraft): string | null {
  if (!draft.text.trim()) return 'Question text is required'
  if (isMcq(draft.type)) {
    if (draft.options.length < 2) return 'MCQ questions need at least 2 options'
    if (draft.options.some((option) => !option.text.trim())) return 'Every option needs text'
    if (draft.correctOptions.length === 0) return 'Mark at least one correct option'
    if (draft.type === 'mcq_single' && draft.correctOptions.length !== 1) return 'Single-select needs exactly one correct option'
  }
  return null
}

export function draftToBody(draft: QuestionDraft): QuestionCreateBody {
  const mcq = isMcq(draft.type)
  return {
    type: draft.type,
    text: draft.text.trim(),
    options: mcq ? draft.options.map((option) => ({ id: option.id, text: option.text.trim() })) : null,
    correct_options: mcq ? draft.correctOptions : null,
    expected_answer: !mcq && draft.expectedAnswer.trim() ? draft.expectedAnswer.trim() : null,
    source: draft.source,
  }
}
