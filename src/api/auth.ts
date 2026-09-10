import { api } from './client'
import type { ApiEnvelope, AuthContextOption, AuthUser, LoginResult } from './types'

export const authApi = {
  async login(email: string, password: string): Promise<LoginResult> {
    const { data } = await api.post<ApiEnvelope<LoginResult>>('/api/v1/auth/login', {
      email,
      password,
    })
    return data.data
  },

  async logout(): Promise<void> {
    await api.post<ApiEnvelope<null>>('/api/v1/auth/logout')
  },

  async me(): Promise<AuthUser> {
    const { data } = await api.get<ApiEnvelope<AuthUser>>('/api/v1/auth/me')
    return data.data
  },

  async contextOptions(): Promise<{
    requires_context: boolean
    contexto: AuthContextOption | null
    options: AuthContextOption[]
  }> {
    const { data } = await api.get<
      ApiEnvelope<{
        requires_context: boolean
        contexto: AuthContextOption | null
        options: AuthContextOption[]
      }>
    >('/api/v1/auth/context-options')
    return (
      data.data ?? {
        requires_context: false,
        contexto: null,
        options: [],
      }
    )
  },

  async setContext(payload: { organizacion_id?: number | null; rol_id: number }): Promise<AuthUser> {
    const { data } = await api.post<ApiEnvelope<AuthUser>>('/api/v1/auth/context', payload)
    return data.data
  },
}
