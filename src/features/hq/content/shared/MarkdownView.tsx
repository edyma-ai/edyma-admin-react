import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Image as ImageIcon } from 'lucide-react'
import 'katex/dist/katex.min.css'
import { cn } from '@/lib/cn'
import { interactiveSlug, normalizeInlineMath } from '@/lib/markdown'
import { isS3Uri, resolveS3Url } from '@/lib/s3'
import { InteractiveEmbed } from '@/features/hq/content/shared/InteractiveEmbed'

export interface MarkdownViewProps {
  markdown: string
  className?: string
}

/**
 * Read-only markdown renderer for master content and TLM sections.
 *
 * The same pipeline the student app and the site use - GFM, `remark-math`,
 * KaTeX - so what the console shows is what a student sees. The tiptap
 * viewer it replaces had no notion of math: every `$...$` in a chapter
 * rendered as literal dollars, and `![](interactive://...)` sims were dropped
 * on the floor. Inline `$...$` is normalised first (see `lib/markdown.ts`),
 * mirroring the app and the site, so an expression next to punctuation
 * renders the same in all three.
 */
export function MarkdownView({ markdown, className }: MarkdownViewProps) {
  const normalized = useMemo(() => normalizeInlineMath(markdown), [markdown])
  return (
    <div className={cn('markdown-body', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: MarkdownImage,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}

/**
 * An image in master content is one of three things: an `interactive://`
 * sim (rendered live), an `s3://` key (resolved to a presigned URL), or a
 * plain URL.
 */
function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  const source = src ?? ''
  const slug = interactiveSlug(source)
  const [resolved, setResolved] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isS3Uri(source)) return
    let cancelled = false
    resolveS3Url(source)
      .then((url) => {
        if (!cancelled) setResolved(url)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [source])

  if (slug) return <InteractiveEmbed slug={slug} />
  if (failed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-danger">
        <ImageIcon size={14} /> Image unavailable
      </span>
    )
  }
  const url = isS3Uri(source) ? resolved : source
  if (!url) return <span className="inline-block h-24 w-40 animate-pulse rounded-lg bg-ink/5 dark:bg-white/10" />
  return <img src={url} alt={alt ?? ''} loading="lazy" />
}
