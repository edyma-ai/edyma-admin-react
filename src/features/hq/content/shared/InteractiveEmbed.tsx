import { Zap } from 'lucide-react'
import { useInteractiveElement } from '@/api/queries/curriculum'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'

/**
 * A chapter's interactive sim, rendered live the way the app's WebView does.
 *
 * The HTML is self-contained (no network), so it goes into a sandboxed
 * `srcdoc` iframe: scripts run, nothing else is allowed, and the authored
 * aspect ratio sizes the box exactly as the student's inline block does.
 */
export function InteractiveEmbed({ slug, className }: { slug: string; className?: string }) {
  const element = useInteractiveElement(slug)

  if (element.isPending) return <Skeleton className={cn('my-3 aspect-[4/3] w-full rounded-card', className)} />
  if (element.isError || !element.data) {
    return (
      <div className={cn('my-3 flex items-center gap-2 rounded-card border border-dashed border-hairline px-3 py-2 text-[12px] text-muted', className)}>
        <Zap className="h-3.5 w-3.5" /> Interactive element <span className="font-mono">{slug}</span> could not be loaded.
      </div>
    )
  }

  const ratio = element.data.aspect_ratio > 0 ? element.data.aspect_ratio : 4 / 3
  return (
    <figure className={cn('my-3', className)}>
      <div className="overflow-hidden rounded-card border border-hairline bg-surface" style={{ aspectRatio: String(ratio) }}>
        <iframe title={element.data.title} srcDoc={element.data.html} sandbox="allow-scripts" className="h-full w-full border-0" loading="lazy" />
      </div>
      <figcaption className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
        <Zap className="h-3.5 w-3.5" /> {element.data.title} · <span className="font-mono">{slug}</span>
      </figcaption>
    </figure>
  )
}
