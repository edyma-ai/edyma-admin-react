import axios from 'axios'

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as { detail?: string | Array<{ msg?: string }> }
    if (typeof d?.detail === 'string') return d.detail
    if (Array.isArray(d?.detail)) return d.detail.map((x) => x.msg).filter(Boolean).join(', ') || err.message
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}
