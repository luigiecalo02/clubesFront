import { api } from './client'
import type { ApiEnvelope, AuthContextOption, AuthUser, LoginResult, TenantHandoff } from './types'

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
    menu_options: AuthContextOption[]
  }> {
    const { data } = await api.get<
      ApiEnvelope<{
        requires_context: boolean
        contexto: AuthContextOption | null
        options: AuthContextOption[]
        menu_options?: AuthContextOption[]
      }>
    >('/api/v1/auth/context-options')
    const payload = data.data
    return {
      requires_context: payload?.requires_context ?? false,
      contexto: payload?.contexto ?? null,
      options: payload?.options ?? [],
      menu_options: payload?.menu_options ?? payload?.options ?? [],
    }
  },

  async setContext(payload: { organizacion_id?: number | null; rol_id: number }): Promise<AuthUser> {
    const { data } = await api.post<ApiEnvelope<AuthUser>>('/api/v1/auth/context', payload)
    return data.data
  },

  async issueHandoff(payload: {
    organizacion_id?: number | null
    rol_id: number
  }): Promise<TenantHandoff> {
    const { data } = await api.post<ApiEnvelope<TenantHandoff>>('/api/v1/auth/handoff', payload)
    return data.data
  },

  async consumeHandoff(code: string): Promise<LoginResult> {
    const { data } = await api.post<ApiEnvelope<LoginResult>>('/api/v1/auth/handoff/consume', { code })
    return data.data
  },

  async forgotPassword(payload: {
    email?: string
    identificacion?: string
    organizacionId?: number | null
  }): Promise<{ email_masked?: string }> {
    const { data } = await api.post<ApiEnvelope<{ email_masked?: string }>>('/api/v1/auth/password/forgot', {
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.identificacion ? { identificacion: payload.identificacion } : {}),
      ...(payload.organizacionId ? { organizacion_id: payload.organizacionId } : {}),
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

  async impersonate(userId: number): Promise<LoginResult> {
    const { data } = await api.post<ApiEnvelope<LoginResult>>(`/api/v1/auth/impersonate/${userId}`)
    return data.data
  },

  async stopImpersonation(): Promise<LoginResult> {
    const { data } = await api.post<ApiEnvelope<LoginResult>>('/api/v1/auth/stop-impersonation')
    return data.data
  },
}
