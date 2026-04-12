import { Outlet } from 'react-router-dom'
import { LogOut } from 'react-feather'
import { Sidebar } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/auth/useAuth'

export function AdminLayout() {
  const { user, school, logout } = useAuth()
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar role={user?.role ?? null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border-light bg-white px-6">
          <div className="truncate text-sm text-muted">
            {school ? (
              <>
                <span className="font-semibold text-brand-slate">{school.name}</span>
                <span className="mx-2 text-border">·</span>
              </>
            ) : null}
            Signed in as <span className="font-medium text-brand-slate">{user?.display_name}</span>
            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs capitalize text-muted">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            <LogOut size={16} />
            Sign out
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
