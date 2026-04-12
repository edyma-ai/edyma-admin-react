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
          const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
            `${apiBaseUrl}/api/v1/auth/refresh`,
            { refresh_token: rt },
          )
          setTokens(data.access_token, data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          clearTokens()
          onAuthExpired?.()
        }
      } else {
        clearTokens()
        onAuthExpired?.()
      }
    }
    return Promise.reject(error)
  },
)
