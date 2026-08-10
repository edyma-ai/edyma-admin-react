import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Spinner size="lg" className="text-sky" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky text-xl font-extrabold text-white shadow-card">E</span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              Edyma<span className="text-sky">.</span> Admin
            </h1>
            <p className="mt-1 text-[13px] text-muted">Sign in to the console</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6 shadow-card"
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? (
            <p role="alert" className="flex items-start gap-2 rounded-control bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
              <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">For Edyma teams and school managers.</p>
      </div>
    </div>
  )
}
