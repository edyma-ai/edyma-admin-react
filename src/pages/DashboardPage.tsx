import { useEffect, useState } from 'react'
import { RefreshCw } from 'react-feather'
import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/auth/useAuth'
import type { AdminStats } from '@/types/models'
import { apiErrorMessage } from '@/lib/apiError'

export function DashboardPage() {
  const { user, school } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function fetchStats() {
    setLoading(true)
    setError('')
    const ac = new AbortController()
    api
      .get<AdminStats>('/api/v1/admin/stats', { signal: ac.signal })
      .then(({ data }) => {
        setStats(data)
        setLoading(false)
      })
      .catch((e) => {
        if (ac.signal.aborted) return
        setError(apiErrorMessage(e))
        setLoading(false)
      })
    return ac
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const ac = fetchStats()
    return () => ac.abort()
  }, [])

  const greeting = user?.display_name ? `Welcome, ${user.display_name}` : 'Welcome back'

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={greeting}
        actions={
          <Button variant="ghost" size="sm" onClick={() => fetchStats()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        }
      />

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      ) : null}

      {user?.role === 'super_admin' && (
        loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Schools" value={stats.school_count ?? 0} />
            <StatCard label="Users" value={stats.user_count ?? 0} />
            <StatCard label="Classrooms" value={stats.classroom_count ?? 0} />
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-muted">Users by role</div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {Object.entries(stats.users_by_role ?? {}).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="capitalize text-brand-slate">{k.replace('_', ' ')}</span>
                    <span className="font-semibold text-brand-slate">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null
      )}

      {user?.role === 'school_manager' && (
        <>
          {school ? (
            <div className="mb-6 rounded-xl border border-border bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-brand-slate">{school.name}</h2>
              {school.city || school.country ? (
                <p className="mt-0.5 text-sm text-muted">
                  {[school.city, school.country].filter(Boolean).join(', ')}
                </p>
              ) : null}
            </div>
          ) : null}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : stats ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Teachers" value={stats.teacher_count ?? 0} />
              <StatCard label="Students" value={stats.student_count ?? 0} />
              <StatCard label="Classrooms" value={stats.classroom_count ?? 0} />
            </div>
          ) : null}
        </>
      )}

      {!loading && !error && !stats ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="text-muted" />
        </div>
      ) : null}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2 text-3xl font-bold text-brand-slate">{value}</div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-100" />
    </div>
  )
}
