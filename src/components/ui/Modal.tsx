import { useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from '@/components/ui/IconButton'
import { Overlay } from '@/components/ui/Overlay'

type ModalSize = 'sm' | 'md' | 'lg'

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: ModalSize
  footer?: ReactNode
  children: ReactNode
}

export function Modal({ open, onClose, title, description, size = 'md', footer, children }: ModalProps) {
  const titleId = useId()

  return (
    <Overlay
      open={open}
      onClose={onClose}
      align="center"
      labelledBy={titleId}
      panelClassName={cn('flex max-h-[85vh] w-full flex-col rounded-card border border-hairline bg-surface shadow-pop', SIZES[size])}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-bold tracking-tight text-ink">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
        </div>
        <IconButton label="Close" icon={<X />} size="sm" onClick={onClose} className="-mr-1 -mt-1" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer ? <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-4">{footer}</div> : null}
    </Overlay>
  )
}
