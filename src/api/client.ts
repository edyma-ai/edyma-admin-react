import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const ACCESS = 'edyma_admin_access'
const REFRESH = 'edyma_admin_refresh'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS)
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH)
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS, access)
  localStorage.setItem(REFRESH, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS)
  localStorage.removeItem(REFRESH)
}

let onAuthExpired: (() => void) | null = null
export function setAuthExpiredHandler(fn: () => void) {
  onAuthExpired = fn
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const t = getStoredAccessToken()
  if (t) {
    config.headers.Authorization = `Bearer ${t}`
  }
  return config
})

const AUTH_ENDPOINTS = ['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/v1/auth/register']

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false
  return AUTH_ENDPOINTS.some((ep) => url.includes(ep))
}

/** True only for a definitive 401/403 response — never for network errors or 5xx. */
export function isAuthRejection(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const status = err.response?.status
  return status === 401 || status === 403
}

// Parallel 401s share one in-flight refresh — the first racer fires it, the rest await it.
let refreshInFlight: Promise<{ access_token: string; refresh_token: string }> | null = null

function refreshTokens(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  refreshInFlight ??= axios
    .post<{ access_token: string; refresh_token: string }>(`${apiBaseUrl}/api/v1/auth/refresh`, { refresh_token: refreshToken })
    .then(({ data }) => {
      setTokens(data.access_token, data.refresh_token)
      return data
    })
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config
    const status = error.response?.status

    // Never intercept 401s from auth endpoints — those are intentional
    // rejections (wrong credentials, bad refresh token) that the caller handles.
    if (status === 401 && original && !isAuthEndpoint(original.url) && !(original as { _retry?: boolean })._retry) {
      ;(original as { _retry?: boolean })._retry = true
      const rt = getStoredRefreshToken()
      if (rt) {
        try {
          const data = await refreshTokens(rt)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch (refreshErr) {
          // Only a rejected refresh token ends the session; a network error or
          // 5xx leaves tokens in place so a later request can retry the refresh.
          if (isAuthRejection(refreshErr)) {
            clearTokens()
            onAuthExpired?.()
          }
        }
      } else {
        clearTokens()
        onAuthExpired?.()
      }
    }
    return Promise.reject(error)
  },
)
