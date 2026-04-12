import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Lock } from 'react-feather'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/auth/useAuth'
import { apiErrorMessage } from '@/lib/apiError'

export function LoginPage() {
  const { user, login, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Spinner size="lg" className="text-brand-slate" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (err: unknown) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-slate shadow">
            <Lock className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-brand-slate">Edyma Admin</h1>
          <p className="mt-1 text-sm text-muted">Sign in with your admin account</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <form className="space-y-5" onSubmit={onSubmit}>
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="admin@edyma.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Contact your administrator if you don&apos;t have access.
        </p>
      </div>
    </div>
  )
}

