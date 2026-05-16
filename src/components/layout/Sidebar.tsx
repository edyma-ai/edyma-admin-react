import { NavLink } from 'react-router-dom'
import { Home, Layers, Users, Book, MessageSquare, Cpu, Bell } from 'react-feather'
import type { UserRole } from '@/types/models'
import { cn } from '@/lib/cn'

const linkClass =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-muted hover:bg-white/60 hover:text-brand-slate'

const activeClass = 'bg-white text-brand-slate shadow-sm border border-border-light'

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  roles: UserRole[]
}

const items: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: Home, roles: ['super_admin', 'school_manager', 'super_sales_manager'] },
  { to: '/schools', label: 'Schools', icon: Book, roles: ['super_admin', 'super_sales_manager', 'super_content_manager'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['super_admin', 'school_manager', 'super_sales_manager'] },
  { to: '/classrooms', label: 'Classrooms', icon: Layers, roles: ['super_admin', 'school_manager', 'super_content_manager'] },
  { to: '/support', label: 'Support', icon: MessageSquare, roles: ['super_admin'] },
  { to: '/llm-config', label: 'LLM Config', icon: Cpu, roles: ['super_admin'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['super_admin'] },
]

export function Sidebar({ role }: { role: UserRole | null }) {
  const filtered = items.filter((i) => (role ? i.roles.includes(role) : false))
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border-light bg-slate-50/80">
      <div className="border-b border-border-light px-4 py-5">
        <div className="text-lg font-bold text-brand-slate">Edyma</div>
        <div className="text-xs font-medium text-muted">Admin</div>
      </div>
      <nav className="flex flex-col gap-0.5 p-3">
        {filtered.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(linkClass, isActive && activeClass)}
          >
            <item.icon size={18} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-border-light p-3 text-xs text-muted">
        Subjects & chapters are opened from each classroom.
      </div>
    </aside>
  )
}
