import { useRef, useState, type DragEvent } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface FileDropProps {
  onFile: (file: File) => void
  /** Native accept filter, e.g. '.csv,text/csv'. */
  accept?: string
  title?: string
  hint?: string
  className?: string
}

/** Click-or-drop file target (CSV import). Hands the raw File to the caller. */
export function FileDrop({ onFile, accept, title = 'Drop a file here', hint, className }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'focus-ring flex w-full flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging ? 'border-sky bg-sky-soft' : 'border-hairline bg-surface hover:border-sky/40',
          className,
        )}
      >
        <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-soft text-sky">
          <Upload aria-hidden className="h-5 w-5" />
        </span>
        <span className="text-sm font-bold text-ink">{title}</span>
        {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          event.target.value = ''
        }}
      />
    </>
  )
}
