import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ROLE_LABELS } from '@/lib/roles'
import { useAuth } from '@/auth/useAuth'
import { useTheme } from '@/theme/useTheme'
import { useLeads } from '@/api/queries/leads'
import { navigationForRole, type NavGroup } from '@/components/layout/navigation'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { Overlay } from '@/components/ui/Overlay'
import { Tooltip } from '@/components/ui/Tooltip'

const SIDEBAR_COLLAPSED_KEY = 'edyma_admin_sidebar_collapsed'

/** New-lead count on the Leads nav item. Mounted only when the item exists (sa/sm), so the query never 403s. */
function NewLeadsBadge() {
  const leads = useLeads('new', { staleTime: 60_000 })
  const count = leads.data?.length ?? 0
  if (count === 0) return null
  return <span className="ml-auto rounded-full bg-sky px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-3 text-white">{count}</span>
}

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex h-16 items-center gap-2.5 border-b border-hairline', collapsed ? 'justify-center px-2' : 'px-5')}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky text-sm font-extrabold text-white">E</span>
      {!collapsed ? (
        <span className="text-lg font-extrabold tracking-tight text-ink">
          Edyma<span className="text-sky">.</span>
        </span>
      ) : null}
    </div>
  )
}

function UserMenu() {
  const { user, school, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) return null

  const initials = user.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="focus-ring flex items-center gap-2 rounded-control px-1.5 py-1 transition-colors hover:bg-ink/5 dark:hover:bg-white/5"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-soft text-xs font-bold text-sky-deep dark:text-sky">
          {initials || 'U'}
        </span>
        <span className="hidden text-left md:block">
          <span className="block max-w-40 truncate text-[13px] font-semibold text-ink">{user.display_name}</span>
          <span className="block text-[11px] text-muted">{ROLE_LABELS[user.role]}</span>
        </span>
        <ChevronDown aria-hidden className={cn('h-4 w-4 text-muted transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-64 rounded-card border border-hairline bg-elevated p-2 shadow-pop"
        >
          <div className="border-b border-hairline px-3 pb-3 pt-1.5">
            <p className="truncate text-[13px] font-semibold text-ink">{user.display_name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone="sky">{ROLE_LABELS[user.role]}</Badge>
              {user.role === 'school_manager' && school ? <Badge tone="neutral">{school.name}</Badge> : null}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              logout()
              navigate('/login')
            }}
            className="focus-ring mt-1.5 flex w-full items-center gap-2 rounded-control px-3 py-2 text-[13px] font-semibold text-danger transition-colors hover:bg-danger-soft"
          >
            <LogOut aria-hidden className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

/** Nav groups shared by the desktop sidebar and the mobile off-canvas drawer. */
function SidebarNav({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((group, groupIndex) => (
        <div key={group.label ?? groupIndex} className={cn(groupIndex > 0 && 'mt-5')}>
          {group.label && !collapsed ? (
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">{group.label}</p>
          ) : null}
          {group.label && collapsed ? <div className="mx-2 mb-2 border-t border-hairline" /> : null}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const link = (
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'focus-ring flex items-center gap-2.5 rounded-control py-2 text-[13px] font-semibold transition-colors',
                      collapsed ? 'justify-center px-0' : 'px-3',
                      isActive ? 'bg-sky-soft text-sky-deep dark:text-sky' : 'text-muted hover:bg-ink/5 hover:text-ink dark:hover:bg-white/5',
                    )
                  }
                >
                  <item.icon aria-hidden className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  {!collapsed && item.to === '/leads' ? <NewLeadsBadge /> : null}
                </NavLink>
              )
              return (
                <li key={item.to}>
                  {collapsed ? (
                    <Tooltip content={item.label} side="right" className="w-full [&>span[role=tooltip]]:z-50">
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const groups = useMemo(() => (user ? navigationForRole(user.role) : []), [user])

  const currentSection = useMemo(() => {
    const items = groups.flatMap((group) => group.items)
    const match = items.find((item) =>
      item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
    )
    return match?.label
  }, [groups, location.pathname])

  // Browser-tab title follows the active nav section for every route in the shell.
  useEffect(() => {
    document.title = currentSection ? `${currentSection} · Edyma Admin` : 'Edyma Admin'
  }, [currentSection])

  function toggleSidebar() {
    setCollapsed((prev) => {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, prev ? '0' : '1')
      return !prev
    })
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-hairline bg-surface transition-[width] duration-200 md:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <BrandMark collapsed={collapsed} />
        <SidebarNav groups={groups} collapsed={collapsed} />
      </aside>

      {/* Below md the sidebar becomes an off-canvas drawer behind the hamburger. */}
      <Overlay
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        align="left"
        label="Navigation"
        panelClassName="flex h-full w-72 max-w-[85vw] flex-col border-r border-hairline bg-surface shadow-pop"
      >
        <BrandMark collapsed={false} />
        <SidebarNav groups={groups} collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
      </Overlay>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-canvas/90 px-4 backdrop-blur lg:px-6">
          <IconButton label="Open navigation" icon={<Menu />} className="md:hidden" onClick={() => setMobileNavOpen(true)} />
          <IconButton
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            className="hidden md:inline-flex"
            onClick={toggleSidebar}
          />
          {currentSection ? <p className="text-[13px] font-semibold text-muted">{currentSection}</p> : null}
          <div className="flex-1" />
          <IconButton
            label={theme === 'lumen' ? 'Switch to Eclipse theme' : 'Switch to Lumen theme'}
            icon={theme === 'lumen' ? <Moon /> : <Sun />}
            onClick={toggleTheme}
          />
          <UserMenu />
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
