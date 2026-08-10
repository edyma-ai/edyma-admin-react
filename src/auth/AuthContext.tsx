/* eslint-disable react-refresh/only-export-components -- context + provider in one module */
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, clearTokens, isAuthRejection, setAuthExpiredHandler, setTokens, getStoredAccessToken } from '@/api/client'
import { queryClient } from '@/api/queryClient'
import { apiErrorMessage } from '@/lib/apiError'
import type { Me, TokenResponse } from '@/types/auth'
import type { SchoolProfile } from '@/types/schools'

const ADMIN_ROLES = ['super_admin', 'school_manager', 'super_sales_manager', 'super_content_manager'] as const

interface AuthState {
  user: Me | null
  school: SchoolProfile | null
  loading: boolean
  /** Set when session restore failed without invalidating the tokens (network error, 5xx) — retry via refreshSession. */
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

function isAdminRole(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [school, setSchool] = useState<SchoolProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const logout = useCallback(() => {
    clearTokens()
    // Purge cached queries so the next account never sees this one's data.
    queryClient.clear()
    setUser(null)
    setSchool(null)
    setError(null)
  }, [])

  const loadSchool = useCallback(async () => {
    try {
      const { data } = await api.get<SchoolProfile>('/api/v1/schools/me')
      setSchool(data)
    } catch {
      setSchool(null)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    const token = getStoredAccessToken()
    if (!token) {
      setUser(null)
      setSchool(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: me } = await api.get<Me>('/api/v1/auth/me')
      if (!isAdminRole(me.role)) {
        logout()
        return
      }
      setUser(me)
      await loadSchool()
    } catch (err) {
      // Only a definitive 401/403 destroys the session; a network error or 5xx
      // keeps the tokens and surfaces a retryable error instead.
      if (isAuthRejection(err)) {
        logout()
      } else {
        setError(apiErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }, [logout, loadSchool])

  useEffect(() => {
    setAuthExpiredHandler(() => {
      logout()
      window.location.href = '/login'
    })
    void refreshSession()
  }, [logout, refreshSession])

  const login = useCallback(
    async (email: string, password: string) => {
      let data: TokenResponse
      try {
        const resp = await api.post<TokenResponse>('/api/v1/auth/login', { email, password })
        data = resp.data
      } catch (err) {
        throw new Error(apiErrorMessage(err))
      }

      // Drop any cache left over from a previous account on this browser.
      queryClient.clear()
      setTokens(data.access_token, data.refresh_token)

      if (!isAdminRole(data.user.role)) {
        logout()
        throw new Error('This account is not authorized for the admin console.')
      }

      setError(null)
      setUser(data.user)
      await loadSchool()
    },
    [logout, loadSchool],
  )

  const value = useMemo(
    () => ({
      user,
      school,
      loading,
      error,
      login,
      logout,
      refreshSession,
    }),
    [user, school, loading, error, login, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
