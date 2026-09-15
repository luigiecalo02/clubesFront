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

  async forgotPassword(email: string, organizacionId?: number | null): Promise<{ email_masked?: string }> {
    const { data } = await api.post<ApiEnvelope<{ email_masked?: string }>>('/api/v1/auth/password/forgot', {
      email,
      ...(organizacionId ? { organizacion_id: organizacionId } : {}),
    })
    return data.data ?? {}
  },

  async verifyEmail(id: number, hash: string): Promise<void> {
    await api.post('/api/v1/auth/email/verify', { id, hash })
  },

  async resendVerification(email: string): Promise<void> {
    await api.post('/api/v1/auth/email/resend', { email })
  },

  async resetPassword(payload: {
    email: string
    token: string
    password: string
    password_confirmation: string
    organizacion_id?: number | null
  }): Promise<{ token?: string } | null> {
    const { data } = await api.post<ApiEnvelope<{ token?: string } | null>>(
      '/api/v1/auth/password/reset',
      payload,
    )
    return data.data
  },
}
