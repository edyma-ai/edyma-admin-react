import { useContext } from 'react'
import { ToastContext } from '@/components/ui/Toast'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}
