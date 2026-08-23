import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, MessageSquare, Send } from 'lucide-react'
import { useBroadcast, useNoticeTemplates, useParentThread, useParentThreads, useReply, useUploadNoticeMedia } from '@/api/queries/parentComms'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileDrop } from '@/components/ui/FileDrop'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Tabs } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import type { MediaAttachment, ParentMessage, ParentThread } from '@/types/parentComms'
import { Timestamp } from '@/features/hq/shared/Timestamp'
import { LanguageBadge } from '@/features/hq/parents/shared'
import { windowLabel } from '@/features/hq/parents/format'
import { allFilled, humanise, mediaHeaderProblem, mediaHeaderRule, submittableValues } from '@/features/hq/parents/templateForm'
import { TemplateFields, TemplatePreview, UnapprovedTemplateWarning } from '@/features/hq/parents/templateFields'

/** Matches the server's cap in `service.get_thread`. Not a page size: the
 * thread is the newest slice of a conversation, and full history lives in the
 * delivery log rather than behind a "load more" nobody would page through. */
const THREAD_LIMIT = 200

/** Free-form is only legal inside the window; a template is always legal. */
type ComposeMode = 'reply' | 'template'

function ThreadRow({ thread, active, onSelect }: { thread: ParentThread; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-1 border-b border-hairline px-4 py-3 text-left transition hover:bg-ink/[0.03] dark:hover:bg-white/5',
        active && 'bg-sky-soft/60 dark:bg-white/10',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{thread.parent_name || thread.student_name}</span>
        {thread.unread_count > 0 ? <Badge tone="sky">{thread.unread_count}</Badge> : null}
      </div>
      <span className="truncate text-[13px] text-muted">{thread.last_message_preview || '-'}</span>
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <Timestamp at={thread.last_message_at} />
        {thread.window_open ? <Badge tone="success">Can reply</Badge> : null}
      </div>
    </button>
  )
}

function Bubble({ message }: { message: ParentMessage }) {
  const inbound = message.direction === 'inbound'
  return (
    <div className={cn('flex', inbound ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
          inbound ? 'bg-ink/5 dark:bg-white/10' : 'bg-sky text-white',
        )}
      >
        <p className="whitespace-pre-wrap">{message.body_text || '-'}</p>
        <div className={cn('mt-1 flex items-center gap-2 text-[11px]', inbound ? 'text-muted' : 'text-white/70')}>
          <Timestamp at={message.created_at} />
          {!inbound ? <span>{message.status}</span> : null}
        </div>
        {message.error_message ? <p className="mt-1 text-[11px] text-danger">{message.error_message}</p> : null}
      </div>
    </div>
  )
}


/**
 * Send an approved template to one parent, from the inbox.
 *
 * Offered whichever way the 24-hour window is facing. Outside it a template is
 * the only thing WhatsApp permits; inside it free-form is easier but a template
 * is still the right choice for anything that should read identically to every
 * parent, so hiding this while the window is open just sent people to another
 * screen to do the same job.
 *
 * The send goes through the ordinary broadcast path, so it lands in the log,
 * honours the opt-out, and cannot double-send.
 */
function TemplateComposer({ studentId, onSent }: { studentId: string; onSent: () => void }) {
  const toast = useToast()
  const [templateCode, setTemplateCode] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [media, setMedia] = useState<MediaAttachment | null>(null)

  const noticeTemplates = useNoticeTemplates()
  const broadcast = useBroadcast()
  const uploadMedia = useUploadNoticeMedia()

  const template = (noticeTemplates.data ?? []).find((entry) => entry.code === templateCode)
  // A media-header notice *is* the file; without one there is nothing to send.
  const headerRule = mediaHeaderRule(template)
  const ready = Boolean(template?.meta_name) && allFilled(template, values) && (!headerRule || Boolean(media))

  async function send() {
    if (!template) return
    try {
      await broadcast.mutateAsync({
        audience: { type: 'students', student_ids: [studentId] },
        template_code: template.code,
        parameters: submittableValues(template, values),
        media: headerRule ? media : null,
      })
      setValues({})
      setMedia(null)
      toast.show('Notice queued - sending in the background')
      onSent()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Select
        value={templateCode}
        onChange={(event) => {
          setTemplateCode(event.target.value)
          // Values belong to the template that asked for them; carrying them
          // over would submit one notice's text under another's parameter names.
          setValues({})
          setMedia(null)
        }}
        placeholder={noticeTemplates.isLoading ? 'Loading templates…' : 'Pick an approved notice'}
        options={(noticeTemplates.data ?? []).map((entry) => ({ value: entry.code, label: humanise(entry.code) }))}
      />

      {template ? (
        <>
          <UnapprovedTemplateWarning template={template} />
          <TemplateFields template={template} values={values} onChange={(name: string, value: string) => setValues((current) => ({ ...current, [name]: value }))} />
          <TemplatePreview template={template} values={values} />
          {headerRule ? (
            media ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2 text-[13px]">
                <span className="truncate">{media.filename}</span>
                <Button variant="ghost" onClick={() => setMedia(null)}>
                  Remove
                </Button>
              </div>
            ) : (
              <FileDrop
                accept={headerRule.accept}
                title={uploadMedia.isPending ? 'Uploading…' : headerRule.title}
                hint={headerRule.hint}
                onFile={async (file) => {
                  const problem = mediaHeaderProblem(headerRule, file)
                  if (problem) {
                    toast.show(problem, 'error')
                    return
                  }
                  try {
                    setMedia(await uploadMedia.mutateAsync(file))
                  } catch (err) {
                    toast.show(apiErrorMessage(err), 'error')
                  }
                }}
              />
            )
          ) : null}
          <div className="flex justify-end">
            <Button icon={<Send className="h-4 w-4" />} loading={broadcast.isPending} disabled={!ready} onClick={send}>
              Send notice
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

/**
 * Two-way inbox.
 *
 * Free-form text only inside WhatsApp's 24-hour window; outside it the reply
 * box is replaced by the approved-template picker rather than merely disabled,
 * because "you cannot answer this parent" is not a useful place to leave
 * someone who has something to say.
 */
export function ParentInboxPage() {
  const toast = useToast()
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [composeMode, setComposeMode] = useState<ComposeMode>('reply')

  const threads = useParentThreads()
  const thread = useParentThread(selected)
  const reply = useReply()

  const activeThread = threads.data?.find((t) => t.student_id === selected) ?? null
  const canReply = Boolean(activeThread?.window_open)

  const messagesRef = useRef<HTMLDivElement>(null)
  const messageCount = thread.data?.length ?? 0
  const landedFor = useRef<string | null>(null)

  // Opening a conversation lands on the newest message, the way every
  // messaging app behaves. Starting at the top means scrolling past years of
  // history to reach the thing you opened it for.
  //
  // Keyed on the messages arriving, not on the selection: for an uncached
  // thread the container holds only a spinner at selection time, so scrolling
  // then does nothing and the reader is left at the top once the messages
  // land. Each thread is landed once; after that the follow-arrivals effect
  // below owns the scroll position.
  useEffect(() => {
    const element = messagesRef.current
    if (!element || !selected || !thread.data || landedFor.current === selected) return
    element.scrollTop = element.scrollHeight
    landedFor.current = selected
  }, [selected, thread.data])

  // The thread polls every 15s. Following new arrivals is right, but only when
  // the reader is already at the bottom - otherwise a poll yanks someone out of
  // the history they are deliberately reading.
  useEffect(() => {
    const element = messagesRef.current
    if (!element) return
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    if (distanceFromBottom < 240) element.scrollTop = element.scrollHeight
  }, [messageCount])

  async function send() {
    if (!selected || !draft.trim()) return
    try {
      await reply.mutateAsync({ studentId: selected, bodyText: draft.trim() })
      setDraft('')
      toast.show('Reply sent')
      void thread.refetch()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Parent inbox" description="Messages from parents, and your replies. WhatsApp allows a free-form reply only within 24 hours of their last message." />

      <div className="grid min-h-0 grid-cols-1 gap-4 lg:h-[calc(100vh-13rem)] lg:min-h-[26rem] lg:grid-cols-[320px_1fr]">
        <Card padded={false} className="flex min-h-0 flex-col overflow-hidden lg:h-full">
          {threads.isPending ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : threads.data?.length ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {threads.data.map((item) => (
                <ThreadRow key={item.student_id} thread={item} active={item.student_id === selected} onSelect={() => {
                    setSelected(item.student_id)
                    setComposeMode('reply')
                  }} />
              ))}
            </div>
          ) : (
            <EmptyState icon={MessageSquare} title="No conversations yet" description="Parent replies will appear here once they message you." />
          )}
        </Card>

        <Card padded={false} className="flex min-h-[26rem] flex-col lg:h-full lg:min-h-0">
          {!activeThread ? (
            <EmptyState icon={MessageSquare} title="Pick a conversation" description="Choose a parent on the left to read the thread." />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{activeThread.parent_name || activeThread.student_name}</span>
                  <span className="font-mono text-[12px] text-muted">{activeThread.parent_whatsapp}</span>
                </div>
                <div className="flex items-center gap-2">
                  <LanguageBadge language={activeThread.parent_language} />
                  <Badge tone={activeThread.window_open ? 'success' : 'warning'}>{windowLabel(activeThread.window_expires_at)}</Badge>
                </div>
              </div>

              <div ref={messagesRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
                {thread.isPending ? (
                  <Spinner />
                ) : (
                  <>
                    {messageCount >= THREAD_LIMIT ? (
                      <p className="pb-2 text-center text-[11px] text-muted">
                        Showing the most recent {THREAD_LIMIT} messages. Older ones are in the delivery log.
                      </p>
                    ) : null}
                    {thread.data?.map((message) => <Bubble key={message.id ?? message.created_at} message={message} />)}
                  </>
                )}
              </div>

              <div className="shrink-0 border-t border-hairline p-4">
                {canReply ? (
                  <Tabs
                    className="mb-3"
                    value={composeMode}
                    onChange={(value) => setComposeMode(value as ComposeMode)}
                    tabs={[
                      { value: 'reply', label: 'Reply' },
                      { value: 'template', label: 'Send a template' },
                    ]}
                  />
                ) : (
                  <div className="mb-3 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[12px] text-warning">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>The 24-hour reply window has closed, so only an approved template can reach this parent.</span>
                  </div>
                )}

                {canReply && composeMode === 'reply' ? (
                  <div className="flex items-end gap-2">
                    <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a reply…" rows={2} className="flex-1" />
                    <Button icon={<Send className="h-4 w-4" />} loading={reply.isPending} disabled={!draft.trim()} onClick={send}>
                      Send
                    </Button>
                  </div>
                ) : (
                  <TemplateComposer studentId={activeThread.student_id} onSent={() => void thread.refetch()} />
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
