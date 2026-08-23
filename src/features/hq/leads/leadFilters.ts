import type { Lead, LeadKind, LeadSource, LeadStatus } from '@/types/leads'

export type LeadStatusFilter = LeadStatus | ''
export type LeadKindFilter = LeadKind | ''
export type LeadSourceFilter = LeadSource | ''

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted',
}

export const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'converted']

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  form: 'Form',
  guest: 'Guests',
}

export const LEAD_SOURCES: LeadSource[] = ['form', 'guest']

/** The pipeline only moves forward: new → contacted → converted. */
export const NEXT_LEAD_STATUS: Record<LeadStatus, LeadStatus | null> = {
  new: 'contacted',
  contacted: 'converted',
  converted: null,
}

export function parseLeadStatus(value: string | null): LeadStatusFilter {
  return value === 'new' || value === 'contacted' || value === 'converted' ? value : ''
}

export function parseLeadKind(value: string | null): LeadKindFilter {
  return value === 'student' || value === 'school' ? value : ''
}

export function parseLeadSource(value: string | null): LeadSourceFilter {
  return value === 'form' || value === 'guest' ? value : ''
}

/** What a lead is called in lists and drawer titles, per kind. */
export function leadDisplayName(lead: Lead): string {
  if (lead.kind === 'school') return lead.school_name || lead.contact_name || lead.email || 'Unnamed lead'
  return lead.name || lead.email || 'Unnamed lead'
}

/** Client-side search across every human-readable lead field. */
export function leadMatchesSearch(lead: Lead, needle: string): boolean {
  const haystack = [lead.name, lead.guardian_name, lead.school_name, lead.contact_name, lead.email, lead.phone, lead.city, lead.board, lead.grade]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}
