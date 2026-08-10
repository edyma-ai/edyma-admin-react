import type { ParentLanguage } from '@/types/parentComms'

export const LANGUAGE_LABEL: Record<ParentLanguage, string> = {
  en: 'English',
  hi: 'हिंदी',
  pa: 'ਪੰਜਾਬੀ',
}

/**
 * How long is left to send a free-form reply.
 *
 * WhatsApp only allows one for 24 hours after the parent's last message; the
 * server enforces it too, so this is a courtesy that stops an admin typing a
 * reply that will be refused.
 */
export function windowLabel(expiresAt?: number | null): string {
  if (!expiresAt) return 'No reply window - parent has not written yet'
  const remaining = expiresAt - Date.now()
  if (remaining <= 0) return 'Reply window closed - template only'
  const hours = Math.floor(remaining / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h ${minutes}m left to reply freely` : `${minutes}m left to reply freely`
}
