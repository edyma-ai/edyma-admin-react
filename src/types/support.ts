import type { Timestamped } from '@/types/common'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketCategory = 'bug' | 'feature_request' | 'feedback' | 'general'

export interface AdminNote {
  note: string
  created_by: string
  created_at: number
}

export interface SupportTicket extends Timestamped {
  id: string
  user_id: string
  user_email: string
  user_name: string
  user_role: string
  school_id?: string | null
  category: TicketCategory
  message: string
  attachment_key?: string | null
  status: TicketStatus
  admin_notes: AdminNote[]
}
