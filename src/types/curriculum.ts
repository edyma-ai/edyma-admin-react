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

/** GET /curriculum/chapters/{id} — list item plus the full markdown body. */
export interface Chapter extends ChapterListItem {
  markdown_content?: string | null
}
