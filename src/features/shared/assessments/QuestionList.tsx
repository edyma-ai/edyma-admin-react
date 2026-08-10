/* eslint-disable react-refresh/only-export-components -- the type-label map travels with the rows that render it */
import { Check } from 'lucide-react'
import { AiBadge, Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { Question, QuestionType } from '@/types/assessments'

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq_single: 'MCQ',
  mcq_multiple: 'Multi-select',
  text: 'Text',
  file_upload: 'File upload',
}

/** Provenance pill for a stored question — absence of `source` means manual (no pill). */
export function QuestionSourceBadge({ source }: { source: Question['source'] }) {
  if (source === 'ai' || source === 'ai_edited') return <AiBadge>{source === 'ai_edited' ? 'AI · edited' : 'AI generated'}</AiBadge>
  if (source === 'paper') return <Badge tone="info">From paper</Badge>
  return null
}

function AnswerDetail({ question }: { question: Question }) {
  if (question.options?.length) {
    const correct = new Set(question.correct_options ?? [])
    return (
      <ul className="mt-1.5 flex flex-col gap-1">
        {question.options.map((option) => {
          const isCorrect = correct.has(option.id)
          return (
            <li key={option.id} className={cn('flex items-start gap-1.5 text-xs', isCorrect ? 'font-semibold text-success' : 'text-muted')}>
              {isCorrect ? <Check aria-hidden className="mt-0.5 h-3 w-3 shrink-0" /> : <span aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />}
              <span className="font-mono uppercase">{option.id}.</span>
              <span className="min-w-0">{option.text}</span>
            </li>
          )
        })}
      </ul>
    )
  }
  if (question.expected_answer) {
    return <p className="mt-1.5 text-xs italic text-muted">Expected: {question.expected_answer}</p>
  }
  return null
}

export interface QuestionListProps {
  questions: Question[]
  /** Author view — options with correct answers marked + expected answers. */
  showAnswers?: boolean
}

/** Read-only question rows shared by the School OS and HQ assessment detail pages. */
export function QuestionList({ questions, showAnswers = false }: QuestionListProps) {
  if (questions.length === 0) return <p className="text-[13px] text-muted">No questions added yet.</p>
  return (
    <ul className="flex flex-col">
      {questions.map((question, index) => (
        <li key={question.id} className="flex items-start gap-3 border-b border-hairline py-2.5 last:border-b-0">
          <span className="mt-0.5 font-mono text-xs font-semibold text-muted">{String(index + 1).padStart(2, '0')}</span>
          <div className="min-w-0 flex-1">
            <p className={cn('text-[13px] font-medium text-ink', !showAnswers && 'line-clamp-2')}>{question.text}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge tone="sky">{QUESTION_TYPE_LABELS[question.type]}</Badge>
              <QuestionSourceBadge source={question.source} />
            </div>
            {showAnswers ? <AnswerDetail question={question} /> : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
