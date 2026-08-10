import { EMAIL_RE } from '@/lib/validation'
import type { Section } from '@/types/sections'

/** Column index per import field; -1 = unmapped. */
export interface ColumnMapping {
  email: number
  displayName: number
  role: number
  sectionLabel: number
}

export const IMPORT_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'email', label: 'Email', required: true },
  { key: 'displayName', label: 'Display name', required: true },
  { key: 'role', label: 'Role', required: true },
  { key: 'sectionLabel', label: 'Section label', required: false },
]

const HEADER_ALIASES: Record<keyof ColumnMapping, string[]> = {
  email: ['email', 'e-mail', 'mail', 'email address'],
  displayName: ['display_name', 'displayname', 'name', 'full name', 'full_name', 'student name', 'teacher name'],
  role: ['role', 'type', 'user type'],
  sectionLabel: ['section_label', 'section label', 'section', 'class section'],
}

/** Does the first parsed row look like a header row? */
export function looksLikeHeader(row: string[]): boolean {
  const normalized = row.map((cell) => cell.trim().toLowerCase())
  return Object.values(HEADER_ALIASES).some((aliases) => normalized.some((cell) => aliases.includes(cell)))
}

export function autoMapColumns(headers: string[]): ColumnMapping {
  const normalized = headers.map((header) => header.trim().toLowerCase())
  const used = new Set<number>()
  const mapping: ColumnMapping = { email: -1, displayName: -1, role: -1, sectionLabel: -1 }
  for (const field of IMPORT_FIELDS) {
    const index = normalized.findIndex((header, i) => !used.has(i) && HEADER_ALIASES[field.key].includes(header))
    if (index >= 0) {
      mapping[field.key] = index
      used.add(index)
    }
  }
  return mapping
}

export interface ImportRow {
  /** 1-based data row number, stable across validation runs. */
  line: number
  email: string
  displayName: string
  rawRole: string
  role: 'teacher' | 'student' | null
  sectionLabel: string
  sectionId?: string
  /** Client-side validation failure — such rows are never submitted. */
  error?: string
}

/**
 * Label → section id lookup. Bare labels ("8A") work while unique; a label
 * shared across classes must be qualified as "Class 8 8A".
 */
export function buildSectionLookup(sections: Section[]): Map<string, string | 'ambiguous'> {
  const map = new Map<string, string | 'ambiguous'>()
  function put(key: string, id: string) {
    const normalized = key.trim().toLowerCase()
    const existing = map.get(normalized)
    map.set(normalized, existing && existing !== id ? 'ambiguous' : id)
  }
  for (const section of sections) {
    put(section.label, section.id)
    put(`${section.class_name} ${section.label}`, section.id)
  }
  return map
}

/** Apply the mapping and validate every data row client-side (`sectionLookup: null` = viewer can't resolve labels). */
export function buildImportRows(dataRows: string[][], mapping: ColumnMapping, sectionLookup: Map<string, string | 'ambiguous'> | null): ImportRow[] {
  const seenEmails = new Set<string>()

  return dataRows.map((cells, index) => {
    const cell = (columnIndex: number) => (columnIndex >= 0 ? (cells[columnIndex] ?? '').trim() : '')
    const email = cell(mapping.email)
    const displayName = cell(mapping.displayName)
    const rawRole = cell(mapping.role)
    const sectionLabel = cell(mapping.sectionLabel)
    const normalizedRole = rawRole.toLowerCase()
    const role = normalizedRole === 'teacher' || normalizedRole === 'student' ? normalizedRole : null

    const row: ImportRow = { line: index + 1, email, displayName, rawRole, role, sectionLabel }

    if (!EMAIL_RE.test(email)) row.error = 'Invalid email'
    else if (seenEmails.has(email.toLowerCase())) row.error = 'Duplicate email in this file'
    else if (!displayName) row.error = 'Missing display name'
    else if (!role) row.error = rawRole ? `Unknown role '${rawRole}'. Use teacher or student` : 'Missing role'
    else if (sectionLabel && sectionLookup) {
      const resolved = sectionLookup.get(sectionLabel.toLowerCase())
      if (!resolved) row.error = 'No section matches this label'
      else if (resolved === 'ambiguous') row.error = "Label matches multiple sections. Qualify it, e.g. 'Class 8 8A'"
      else row.sectionId = resolved
    }

    if (EMAIL_RE.test(email)) seenEmails.add(email.toLowerCase())
    return row
  })
}
