import {
  Activity,
  Contact,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  Cpu,
  Gauge,
  GraduationCap,
  Handshake,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  Mail,
  Megaphone,
  MessageSquare,
  Settings,
  ScrollText,
  ShieldCheck,
  Store,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
  Smartphone,
} from 'lucide-react'
import type { UserRole } from '@/types/common'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Match only the exact path for active styling (index-ish routes). */
  end?: boolean
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

type HqNavItem = NavItem & { roles: UserRole[] }

const SA: UserRole[] = ['super_admin']
const SA_SM: UserRole[] = ['super_admin', 'super_sales_manager']
const SA_CM: UserRole[] = ['super_admin', 'super_content_manager']
const HQ_ALL: UserRole[] = ['super_admin', 'super_sales_manager', 'super_content_manager']

const HQ_GROUPS: { label?: string; items: HqNavItem[] }[] = [
  {
    items: [
      { label: 'Overview', to: '/', icon: LayoutDashboard, end: true, roles: HQ_ALL },
      { label: 'Leads', to: '/leads', icon: Handshake, roles: SA_SM },
      { label: 'Schools', to: '/schools', icon: Building2, roles: SA_SM },
      { label: 'Users', to: '/users', icon: Users, roles: SA_SM },
      { label: 'Retail', to: '/retail', icon: Store, roles: HQ_ALL },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Curriculum', to: '/content/curriculum', icon: BookOpen, roles: HQ_ALL },
      { label: 'Assessments', to: '/content/assessments', icon: ClipboardList, roles: SA_CM },
      { label: 'TLMs', to: '/content/tlms', icon: Layers, roles: SA_CM },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Engagement', to: '/analytics/engagement', icon: Activity, roles: SA_SM },
      { label: 'Outcomes', to: '/analytics/outcomes', icon: Target, roles: SA_SM },
      { label: 'Funnel', to: '/analytics/funnel', icon: TrendingUp, roles: SA_SM },
      { label: 'Platform ops', to: '/analytics/ops', icon: Gauge, roles: SA_SM },
    ],
  },
  {
    label: 'Ops',
    items: [
      { label: 'LLM config', to: '/ops/llm-config', icon: Cpu, roles: SA },
      { label: 'RBAC', to: '/ops/rbac', icon: ShieldCheck, roles: SA },
      { label: 'Support', to: '/ops/support', icon: LifeBuoy, roles: SA },
      { label: 'Notifications', to: '/ops/notifications', icon: Bell, roles: SA },
      { label: 'App versions', to: '/ops/app-versions', icon: Smartphone, roles: SA },
    ],
  },
  {
    label: 'Parents',
    items: [
      { label: 'Reports', to: '/parents/reports', icon: Mail, roles: SA },
      { label: 'Inbox', to: '/parents/inbox', icon: MessageSquare, roles: SA },
      { label: 'Notices', to: '/parents/broadcast', icon: Megaphone, roles: SA },
      { label: 'Contacts', to: '/parents/contacts', icon: Contact, roles: SA },
      { label: 'Log', to: '/parents/log', icon: ScrollText, roles: SA },
    ],
  },
]

const SCHOOL_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Overview', to: '/', icon: LayoutDashboard, end: true },
      { label: 'Sections', to: '/sections', icon: LayoutGrid },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Teachers', to: '/teachers', icon: Users },
      { label: 'Students', to: '/students', icon: GraduationCap },
    ],
  },
  {
    items: [
      { label: 'Assessments', to: '/assessments', icon: ClipboardList },
      { label: 'Analytics', to: '/analytics', icon: BarChart3 },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]

/** The sidebar shows what the role can reach; route guards enforce it. */
export function navigationForRole(role: UserRole): NavGroup[] {
  if (role === 'school_manager') return SCHOOL_GROUPS

  return HQ_GROUPS.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => item.roles.includes(role))
      .map(({ label, to, icon, end }) => ({ label, to, icon, end })),
  })).filter((group) => group.items.length > 0)
}
