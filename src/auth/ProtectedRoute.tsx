import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import type { UserRole } from '@/types/common'

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, loading, error, refreshSession } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas">
        <Spinner size="lg" className="text-sky" />
        <p className="mt-4 text-sm font-medium text-muted">Loading…</p>
      </div>
    )
  }

  if (!user) {
    // Session restore failed without invalidating the tokens — offer a retry instead of bouncing to login.
    if (error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas">
          <ErrorState title="Couldn't restore your session" message={error} onRetry={() => void refreshSession()} />
        </div>
      )
    }
    return <Navigate to="/login" replace />
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
