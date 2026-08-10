import { useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from '@/components/ui/IconButton'
import { Overlay } from '@/components/ui/Overlay'

type DrawerSize = 'md' | 'lg'

const SIZES: Record<DrawerSize, string> = {
  md: 'w-full max-w-md',
  lg: 'w-full max-w-2xl',
}

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: DrawerSize
  footer?: ReactNode
  children: ReactNode
}

/** Right-side detail pane — leads, tickets, user usage, etc. */
export function Drawer({ open, onClose, title, description, size = 'md', footer, children }: DrawerProps) {
  const titleId = useId()

  return (
    <Overlay
      open={open}
      onClose={onClose}
      align="right"
      labelledBy={titleId}
      panelClassName={cn('flex h-full flex-col border-l border-hairline bg-surface shadow-pop', SIZES[size])}
    >
      <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-bold tracking-tight text-ink">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
        </div>
        <IconButton label="Close" icon={<X />} size="sm" onClick={onClose} className="-mr-1" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer ? <div className="flex items-center justify-end gap-2 border-t border-hairline px-5 py-4">{footer}</div> : null}
    </Overlay>
  )
}
