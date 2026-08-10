import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ListChecks, ListTodo, Paperclip, Plus, Trash2, Type } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { QuestionType } from '@/types/assessments'
import { QUESTION_TYPE_LABELS, QuestionSourceBadge } from '@/features/shared/assessments/QuestionList'
import { draftError, isMcq, MAX_OPTIONS, newQuestionDraft, nextOptionId, type QuestionDraft } from '@/features/hq/content/assessments/questionDrafts'

const ADD_BUTTONS: { type: QuestionType; icon: ReactNode }[] = [
  { type: 'text', icon: <Type className="h-3.5 w-3.5" /> },
  { type: 'mcq_single', icon: <ListTodo className="h-3.5 w-3.5" /> },
  { type: 'mcq_multiple', icon: <ListChecks className="h-3.5 w-3.5" /> },
  { type: 'file_upload', icon: <Paperclip className="h-3.5 w-3.5" /> },
]

export interface QuestionBuilderProps {
  questions: QuestionDraft[]
  onChange: (questions: QuestionDraft[]) => void
  /** True once the author tried to save — per-question validation surfaces from then on. */
  showErrors: boolean
}

interface QuestionCardProps {
  draft: QuestionDraft
  index: number
  count: number
  showErrors: boolean
  onUpdate: (next: QuestionDraft) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}

function OptionsEditor({ draft, onUpdate }: { draft: QuestionDraft; onUpdate: (next: QuestionDraft) => void }) {
  function markCorrect(optionId: string, checked: boolean) {
    if (draft.type === 'mcq_single') {
      onUpdate({ ...draft, correctOptions: checked ? [optionId] : [] })
      return
    }
    const next = checked ? [...draft.correctOptions, optionId] : draft.correctOptions.filter((id) => id !== optionId)
    onUpdate({ ...draft, correctOptions: next })
  }

  return (
    <div className="flex flex-col gap-2">
      {draft.options.map((option) => (
        <div key={option.id} className="flex items-center gap-2.5">
          <span className="w-4 font-mono text-xs font-semibold uppercase text-muted">{option.id}.</span>
          <Input
            aria-label={`Option ${option.id} text`}
            value={option.text}
            onChange={(event) =>
              onUpdate({ ...draft, options: draft.options.map((row) => (row.id === option.id ? { ...row, text: event.target.value } : row)) })
            }
            placeholder="Option text"
            className="flex-1"
          />
          <Checkbox
            label="Correct"
            checked={draft.correctOptions.includes(option.id)}
            onChange={(event) => markCorrect(option.id, event.target.checked)}
            className="shrink-0"
          />
          <IconButton
            label={`Remove option ${option.id}`}
            size="sm"
            variant="danger"
            icon={<Trash2 />}
            disabled={draft.options.length <= 2}
            onClick={() =>
              onUpdate({
                ...draft,
                options: draft.options.filter((row) => row.id !== option.id),
                correctOptions: draft.correctOptions.filter((id) => id !== option.id),
              })
            }
          />
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        icon={<Plus className="h-3.5 w-3.5" />}
        className="self-start"
        disabled={draft.options.length >= MAX_OPTIONS}
        onClick={() => {
          const id = nextOptionId(draft.options)
          if (id) onUpdate({ ...draft, options: [...draft.options, { id, text: '' }] })
        }}
      >
        Add option
      </Button>
    </div>
  )
}

function QuestionCard({ draft, index, count, showErrors, onUpdate, onMove, onRemove }: QuestionCardProps) {
  const error = showErrors ? draftError(draft) : null
  return (
    <li className="rounded-card border border-hairline bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-muted">{String(index + 1).padStart(2, '0')}</span>
        <Badge tone="sky">{QUESTION_TYPE_LABELS[draft.type]}</Badge>
        <QuestionSourceBadge source={draft.source} />
        <span className="flex-1" />
        <IconButton label="Move up" size="sm" icon={<ArrowUp />} disabled={index === 0} onClick={() => onMove(-1)} />
        <IconButton label="Move down" size="sm" icon={<ArrowDown />} disabled={index === count - 1} onClick={() => onMove(1)} />
        <IconButton label="Remove question" size="sm" variant="danger" icon={<Trash2 />} onClick={onRemove} />
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <Textarea
          aria-label={`Question ${index + 1} text`}
          rows={2}
          value={draft.text}
          onChange={(event) => onUpdate({ ...draft, text: event.target.value })}
          placeholder="Question text…"
        />
        {isMcq(draft.type) ? (
          <OptionsEditor draft={draft} onUpdate={onUpdate} />
        ) : (
          <Textarea
            label="Expected answer (optional)"
            hint="A reference answer helps the AI evaluator. The question profiler fills in the rest either way."
            rows={2}
            value={draft.expectedAnswer}
            onChange={(event) => onUpdate({ ...draft, expectedAnswer: event.target.value })}
          />
        )}
        {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
      </div>
    </li>
  )
}

/** Typed question list editor: add, edit, mark correct answers, reorder, remove. */
export function QuestionBuilder({ questions, onChange, showErrors }: QuestionBuilderProps) {
  function update(key: string, next: QuestionDraft) {
    onChange(questions.map((draft) => (draft.key === key ? next : draft)))
  }

  function move(key: string, direction: -1 | 1) {
    const index = questions.findIndex((draft) => draft.key === key)
    const target = index + direction
    if (index < 0 || target < 0 || target >= questions.length) return
    const next = [...questions]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {questions.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline px-4 py-6 text-center text-[13px] text-muted">
          No questions yet. Add them below, or extract from a printed paper.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {questions.map((draft, index) => (
            <QuestionCard
              key={draft.key}
              draft={draft}
              index={index}
              count={questions.length}
              showErrors={showErrors}
              onUpdate={(next) => update(draft.key, next)}
              onMove={(direction) => move(draft.key, direction)}
              onRemove={() => onChange(questions.filter((row) => row.key !== draft.key))}
            />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {ADD_BUTTONS.map(({ type, icon }) => (
          <Button key={type} variant="secondary" size="sm" icon={icon} onClick={() => onChange([...questions, newQuestionDraft(type)])}>
            {QUESTION_TYPE_LABELS[type]}
          </Button>
        ))}
      </div>
    </div>
  )
}
