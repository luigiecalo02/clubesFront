import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiEnvelope } from './types'
import { resolveApiBaseUrl } from './baseUrl'

export const TOKEN_KEY = 'clubes_token'

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiEnvelope>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('clubes_user')
      const path = window.location.pathname
      if (path !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error: unknown, fallback = 'Error inesperado'): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
      return 'La solicitud tardó demasiado. Intenta de nuevo.'
    }
    if (!error.response) {
      return 'No se pudo conectar con el servidor.'
    }

    const data = error.response.data as ApiEnvelope | undefined

    if (data?.errors) {
      const messages = Object.values(data.errors)
        .flatMap((item) => {
          if (Array.isArray(item)) return item.map((value) => String(value))
          if (typeof item === 'string') return [item]
          return []
        })
        .filter(Boolean)
      if (messages.length) return messages.join(' ')
    }

    if (data?.message) return data.message
    if (error.response.status >= 500) return 'Error del servidor. Intenta de nuevo.'
    return fallback
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}
