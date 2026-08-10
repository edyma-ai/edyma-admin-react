import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export interface ConfirmModalProps {
  title: string
  description?: ReactNode
  confirmLabel: string
  /** 'danger' for destructive confirms (delete). */
  tone?: 'primary' | 'danger'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
  children?: ReactNode
}

/** Small confirm dialog for publish/share/delete — parent renders it conditionally. */
export function ConfirmModal({ title, description, confirmLabel, tone = 'primary', loading = false, onConfirm, onClose, children }: ConfirmModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description ? <p className="text-[13px] text-muted">{description}</p> : null}
      {children}
    </Modal>
  )
}
