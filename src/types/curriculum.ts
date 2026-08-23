/** Master curriculum — fixture-owned, read-only from the console. Ids are slugs (e.g. 'class08'). */

export interface AcademicYear {
  id: string
  label: string
  starts_on: string
  ends_on: string
  is_current: boolean
}

export interface ClassInfo {
  id: string
  name: string
  level: number
}

export interface Subject {
  id: string
  class_id: string
  name: string
  code: string
  order: number
}

export interface ChapterListItem {
  id: string
  class_id: string
  subject_id: string
  name: string
  description?: string | null
  order: number
  audio_recap_key?: string | null
  condensed_notes_md?: string | null
  cheat_sheet_md?: string | null
  created_at: number
  updated_at: number
}

/** A self-contained HTML sim, referenced from chapter markdown as `![](interactive://<id>)`. */
export interface InteractiveElementSummary {
  id: string
  title: string
  description?: string | null
  aspect_ratio: number
  order: number
}

/** GET /curriculum/interactive/{id} — the summary plus the HTML body an iframe can render. */
export interface InteractiveElement {
  id: string
  chapter_id: string
  title: string
  html: string
  aspect_ratio: number
}

/** One of a chapter's Watch-tab videos. `s3` sources are object keys; `youtube` sources are URLs. */
export interface ChapterVideo {
  id: string
  title: string
  source: 'youtube' | 's3' | string
  url_or_key: string
  topic_id?: string | null
  duration_sec?: number | null
  thumbnail_key?: string | null
  order: number
}

/** GET /curriculum/chapters/{id} — list item plus the full markdown body, its sims and its videos. */
export interface Chapter extends ChapterListItem {
  markdown_content?: string | null
  interactive_elements?: InteractiveElementSummary[] | null
  videos?: ChapterVideo[] | null
}
