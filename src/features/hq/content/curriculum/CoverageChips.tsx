import { AudioLines, FileText, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { ChapterListItem } from '@/types/curriculum'

/** What supplementary master content a chapter ships: condensed notes, cheat sheet, audio recap. */
export function CoverageChips({ chapter }: { chapter: ChapterListItem }) {
  const chips = [
    chapter.condensed_notes_md ? { key: 'notes', label: 'Notes', icon: <FileText aria-hidden className="h-3 w-3" /> } : null,
    chapter.cheat_sheet_md ? { key: 'cheat', label: 'Cheat sheet', icon: <Zap aria-hidden className="h-3 w-3" /> } : null,
    chapter.audio_recap_key ? { key: 'audio', label: 'Audio', icon: <AudioLines aria-hidden className="h-3 w-3" /> } : null,
  ].filter((chip): chip is NonNullable<typeof chip> => chip != null)

  if (chips.length === 0) return <span className="text-muted">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <Badge key={chip.key} tone="sky" icon={chip.icon}>
          {chip.label}
        </Badge>
      ))}
    </div>
  )
}
