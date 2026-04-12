/* eslint-disable react-refresh/only-export-components -- context + provider in one module */
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, clearTokens, setAuthExpiredHandler, setTokens, getStoredAccessToken } from '@/api/client'
import { apiErrorMessage } from '@/lib/apiError'
import type { School, User } from '@/types/models'

const ADMIN_ROLES = ['super_admin', 'school_manager'] as const

interface AuthState {
  user: User | null
  school: School | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
    setSchool(null)
  }, [])

  const refreshSession = useCallback(async () => {
    const token = getStoredAccessToken()
    if (!token) {
      setUser(null)
      setSchool(null)
      setLoading(false)
      return
    }
    try {
      const { data: me } = await api.get<User>('/api/v1/auth/me')
      if (!ADMIN_ROLES.includes(me.role as (typeof ADMIN_ROLES)[number])) {
        logout()
        setLoading(false)
        throw new Error('This account is not authorized for the admin console.')
      }
      setUser(me)
      try {
        const { data: sch } = await api.get<School>('/api/v1/schools/me')
        setSchool(sch)
      } catch {
        setSchool(null)
      }
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    setAuthExpiredHandler(() => {
      logout()
      window.location.href = '/login'
    })
    void refreshSession()
  }, [logout, refreshSession])

  const login = useCallback(
    async (email: string, password: string) => {
      let data: { access_token: string; refresh_token: string; user: User }
      try {
        const resp = await api.post<typeof data>('/api/v1/auth/login', { email, password })
        data = resp.data
      } catch (err) {
        throw new Error(apiErrorMessage(err))
      }

      setTokens(data.access_token, data.refresh_token)

      if (!ADMIN_ROLES.includes(data.user.role as (typeof ADMIN_ROLES)[number])) {
        logout()
        throw new Error('This account is not authorized for the admin console.')
      }

      setUser(data.user)

      try {
        const { data: sch } = await api.get<School>('/api/v1/schools/me')
        setSchool(sch)
      } catch {
        setSchool(null)
      }
    },
    [logout],
  )

  const value = useMemo(
    () => ({
      user,
      school,
      loading,
      login,
      logout,
      refreshSession,
    }),
    [user, school, loading, login, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
