import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import { S3Image } from '@/components/ui/RichTextEditor'
import { cn } from '@/lib/cn'

export interface MarkdownViewProps {
  markdown: string
  className?: string
}

/**
 * Read-only markdown renderer on the same tiptap pipeline as RichTextEditor —
 * shares the `.tiptap-content` styles and the s3:// image resolution, so
 * master-curriculum content and AI-generated TLM sections render exactly as
 * they do wherever else the console shows rich text.
 */
export function MarkdownView({ markdown, className }: MarkdownViewProps) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), S3Image.configure({ inline: false, allowBase64: false }), Markdown],
    content: markdown,
    editable: false,
  })

  useEffect(() => {
    editor?.commands.setContent(markdown)
  }, [markdown, editor])

  if (!editor) return null
  return <EditorContent editor={editor} className={cn('tiptap-content tiptap-view text-sm', className)} />
}
