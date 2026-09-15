import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiEnvelope } from './types'
import { resolveApiBaseUrl, resolveClubRootId } from './baseUrl'

export const TOKEN_KEY = 'clubes_token'

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Clubes-Client': 'clubes',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const rootId = resolveClubRootId()
  if (rootId) {
    config.headers['X-Clubes-Root-Id'] = String(rootId)
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
      if (!path.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

const VALIDATION_MESSAGES: Record<string, string> = {
  'validation.confirmed': 'Las contraseñas no coinciden.',
  'validation.required': 'Completa los campos obligatorios.',
  'validation.email': 'El correo no es válido.',
  'validation.min': 'El valor es demasiado corto.',
  'validation.min.string': 'El valor es demasiado corto.',
  'validation.max': 'El valor es demasiado largo.',
  'validation.max.string': 'El valor es demasiado largo.',
  'validation.unique': 'Ya está en uso.',
  'validation.in': 'El valor seleccionado no es válido.',
  'validation.integer': 'El valor no es válido.',
}

function humanizeApiMessage(message: string): string {
  const trimmed = message.trim()
  if (VALIDATION_MESSAGES[trimmed]) return VALIDATION_MESSAGES[trimmed]
  if (trimmed.startsWith('validation.')) return 'Revisa los datos e inténtalo de nuevo.'
  return trimmed
}

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
          if (Array.isArray(item)) return item.map((value) => humanizeApiMessage(String(value)))
          if (typeof item === 'string') return [humanizeApiMessage(item)]
          return []
        })
        .filter(Boolean)
      if (messages.length) return messages.join(' ')
    }

    if (data?.message) return humanizeApiMessage(data.message)
    if (error.response.status >= 500) return 'Error del servidor. Intenta de nuevo.'
    return fallback
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}
