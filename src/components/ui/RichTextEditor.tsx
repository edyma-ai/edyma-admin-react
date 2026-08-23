import { useEditor, EditorContent, type Editor, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TiptapImage from '@tiptap/extension-image'
import { Markdown } from 'tiptap-markdown'
import { useCallback, useEffect, useState } from 'react'
import { isS3Uri, resolveS3Url } from '@/lib/s3'

function getMarkdown(editor: Editor): string {
  return (editor.storage as Record<string, any>).markdown.getMarkdown() // eslint-disable-line @typescript-eslint/no-explicit-any
}
import { cn } from '@/lib/cn'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Image as ImageIcon,
} from 'lucide-react'

/* ── S3 Image NodeView ─────────────────────────────────────────────── */

function S3ImageNodeView({ node }: { node: { attrs: Record<string, unknown> } }) {
  const src = (node.attrs.src as string) ?? ''
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const url = isS3Uri(src) ? resolvedUrl : src

  useEffect(() => {
    if (!isS3Uri(src)) return
    let cancelled = false
    resolveS3Url(src)
      .then((resolved) => { if (!cancelled) setResolvedUrl(resolved) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [src])

  if (error) {
    return (
      <NodeViewWrapper as="span" className="inline-block">
        <span className="inline-flex items-center gap-1 text-xs text-danger">
          <ImageIcon size={14} /> Image unavailable
        </span>
      </NodeViewWrapper>
    )
  }

  if (!url) {
    return (
      <NodeViewWrapper as="span" className="inline-block">
        <span className="inline-flex items-center gap-1 text-xs text-muted">Loading image…</span>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper as="figure" className="my-2">
      <img
        src={url}
        alt={(node.attrs.alt as string) ?? ''}
        title={(node.attrs.title as string) ?? undefined}
        className="max-w-full h-auto rounded-lg"
      />
    </NodeViewWrapper>
  )
}

/** Tiptap image node that resolves s3:// URIs through /files/download-url — also used by the read-only MarkdownView. */
export const S3Image = TiptapImage.extend({
  addNodeView() {
    return ReactNodeViewRenderer(S3ImageNodeView)
  },
})

interface RichTextEditorProps {
  content: string
  onChange: (markdown: string) => void
  editable?: boolean
  className?: string
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'rounded-md p-1.5 transition-colors',
        active
          ? 'bg-sky text-white'
          : 'text-muted hover:bg-ink/5 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-border" />
}

export function RichTextEditor({
  content,
  onChange,
  editable = true,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      S3Image.configure({ inline: false, allowBase64: false }),
      Markdown,
    ],
    content,
    editable,
    onUpdate: ({ editor: e }) => {
      onChange(getMarkdown(e))
    },
  })

  useEffect(() => {
    if (!editor) return
    if (getMarkdown(editor) !== content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const toggle = useCallback(
    (cmd: () => boolean) => () => {
      cmd()
      editor?.commands.focus()
    },
    [editor],
  )

  if (!editor) return null

  return (
    <div
      className={cn(
        'overflow-hidden rounded-control border border-hairline bg-surface',
        !editable && 'opacity-60',
        className,
      )}
    >
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-hairline bg-canvas/80 px-2 py-1.5">
          {/* Headings */}
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <span className="text-xs font-bold">H1</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <span className="text-xs font-bold">H2</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <span className="text-xs font-bold">H3</span>
          </ToolbarButton>

          <ToolbarDivider />

          {/* Inline formatting */}
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().toggleBold().run())}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().toggleItalic().run())}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().toggleUnderline().run())}
            active={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon size={15} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Lists */}
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().toggleBulletList().run())}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().toggleOrderedList().run())}
            active={editor.isActive('orderedList')}
            title="Ordered list"
          >
            <span className="text-xs font-bold">1.</span>
          </ToolbarButton>

          <ToolbarDivider />

          {/* Block */}
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().toggleBlockquote().run())}
            active={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <span className="text-sm font-bold">"</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().toggleCodeBlock().run())}
            active={editor.isActive('codeBlock')}
            title="Code block"
          >
            <Code size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().setHorizontalRule().run())}
            title="Horizontal rule"
          >
            <Minus size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              const uri = window.prompt('S3 image URI (e.g. s3://edyma-s3/chapter-images/...)')
              if (uri?.trim()) {
                editor.chain().focus().setImage({ src: uri.trim() }).run()
              }
            }}
            title="Insert image"
          >
            <ImageIcon size={15} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Alignment */}
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().setTextAlign('left').run())}
            active={editor.isActive({ textAlign: 'left' })}
            title="Align left"
          >
            <AlignLeft size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().setTextAlign('center').run())}
            active={editor.isActive({ textAlign: 'center' })}
            title="Align center"
          >
            <AlignCenter size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={toggle(() => editor.chain().focus().setTextAlign('right').run())}
            active={editor.isActive({ textAlign: 'right' })}
            title="Align right"
          >
            <AlignRight size={15} />
          </ToolbarButton>
        </div>
      )}

      <EditorContent editor={editor} className="tiptap-content px-4 py-3 text-sm" />
    </div>
  )
}
