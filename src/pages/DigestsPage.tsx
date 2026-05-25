import { useState } from 'react'
import { Send } from 'react-feather'
import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/useToast'
import { apiErrorMessage } from '@/lib/apiError'

interface DigestResult {
  sent: number
  skipped: number
  errors: number
}

export function DigestsPage() {
  const { show } = useToast()
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<DigestResult | null>(null)

  async function handleSend() {
    setSending(true)
    setResult(null)
    try {
      const res = await api.post<DigestResult>('/api/v1/digests/send-weekly')
      setResult(res.data)
      show(`Sent to ${res.data.sent} student(s) successfully.`, 'success')
    } catch (e) {
      show(apiErrorMessage(e), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Weekly Digests"
        description="Send pending weekly digest WhatsApp messages to parents in English, Hindi, and Punjabi."
      />

      <div className="max-w-lg rounded-xl border border-border-light bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted">
            This will loop over all unsent digest documents and send a <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">weekly_digest_v1</code> WhatsApp template to each parent in all three languages. Once all three messages are sent, the digest is marked as sent.
          </p>

          {result && (
            <div className="grid grid-cols-3 divide-x divide-border-light rounded-lg border border-border-light text-center text-sm">
              <div className="flex flex-col gap-0.5 py-3">
                <span className="text-xl font-semibold text-brand-slate">{result.sent}</span>
                <span className="text-xs text-muted">Sent</span>
              </div>
              <div className="flex flex-col gap-0.5 py-3">
                <span className="text-xl font-semibold text-brand-slate">{result.skipped}</span>
                <span className="text-xs text-muted">Skipped</span>
              </div>
              <div className="flex flex-col gap-0.5 py-3">
                <span className="text-xl font-semibold text-brand-slate">{result.errors}</span>
                <span className="text-xs text-muted">Errors</span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button onClick={handleSend} disabled={sending}>
              <Send size={16} strokeWidth={2} className="mr-1.5" />
              {sending ? 'Sending…' : 'Send Weekly Digests'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
