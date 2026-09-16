import { api } from './client'
import type {
  ApiEnvelope,
  ClubesAppConfig,
  ClubesAssetKey,
  ClubesPublicBranding,
  ClubesInviteLink,
  ClubesInviteLookup,
  ClubesInvitePreview,
  ClubesRegisterPayload,
  ClubesSettings,
  MailSettings,
  PublicOrgBrowse,
} from './types'

export const settingsApi = {
  async publicOrgs(padreId?: number | null): Promise<PublicOrgBrowse> {
    const { data } = await api.get<ApiEnvelope<PublicOrgBrowse>>(
      '/api/v1/settings/clubes/public/organizaciones',
      { params: padreId ? { padre_id: padreId } : undefined },
    )
    return data.data ?? { path: [], children: [] }
  },

  async register(payload: ClubesRegisterPayload): Promise<void> {
    await api.post('/api/v1/settings/clubes/public/register', payload)
  },

  async createInviteLink(): Promise<ClubesInviteLink> {
    const { data } = await api.post<ApiEnvelope<ClubesInviteLink>>('/api/v1/settings/clubes/invite-link')
    return data.data
  },

  async invitePreview(token: string): Promise<ClubesInvitePreview> {
    const { data } = await api.get<ApiEnvelope<ClubesInvitePreview>>(
      '/api/v1/settings/clubes/public/activate',
      { params: { token } },
    )
    return data.data
  },

  async inviteLookup(token: string, identificacion: string): Promise<ClubesInviteLookup> {
    const { data } = await api.post<ApiEnvelope<ClubesInviteLookup>>(
      '/api/v1/settings/clubes/public/activate/lookup',
      { token, identificacion },
    )
    return data.data
  },

  async inviteActivate(payload: {
    token: string
    identificacion: string
    tipo_identificacion?: string
    nombre1?: string
    apellido1?: string
    correo?: string
    telefono?: string
    sexo?: string
    fecha_nacimiento?: string
    password?: string
    password_confirmation?: string
  }): Promise<{ token: string }> {
    const { data } = await api.post<ApiEnvelope<{ token: string }>>(
      '/api/v1/settings/clubes/public/activate',
      payload,
    )
    return data.data
  },

  async publicBranding(organizacionId?: number | null): Promise<ClubesPublicBranding> {
    const { data } = await api.get<ApiEnvelope<ClubesPublicBranding>>('/api/v1/settings/clubes/public', {
      params: organizacionId ? { organizacion_id: organizacionId } : undefined,
    })
    return data.data
  },

  async show(): Promise<ClubesSettings | null> {
    const { data } = await api.get<ApiEnvelope<ClubesSettings | null>>('/api/v1/settings/clubes')
    return data.data
  },

  async update(payload: Omit<ClubesAppConfig, 'source'>): Promise<ClubesSettings> {
    const { data } = await api.put<ApiEnvelope<ClubesSettings>>('/api/v1/settings/clubes', payload)
    return data.data
  },

  async uploadAsset(asset: ClubesAssetKey, file: File): Promise<ClubesSettings> {
    const body = new FormData()
    body.append('image', file)
    const { data } = await api.post<ApiEnvelope<ClubesSettings>>(
      `/api/v1/settings/clubes/assets/${asset}`,
      body,
      {
        transformRequest: [
          (value, headers) => {
            if (value instanceof FormData) {
              delete headers['Content-Type']
            }
            return value
          },
        ],
      },
    )
    return data.data
  },

  async mail(): Promise<MailSettings> {
    const { data } = await api.get<ApiEnvelope<MailSettings>>('/api/v1/settings/mail')
    return data.data
  },

  async updateMail(payload: Omit<MailSettings, 'password_set' | 'configured'>): Promise<MailSettings> {
    const { data } = await api.put<ApiEnvelope<MailSettings>>('/api/v1/settings/mail', payload)
    return data.data
  },

  async testMail(to: string): Promise<void> {
    await api.post('/api/v1/settings/mail/test', { to })
  },

  async resetAsset(asset: ClubesAssetKey): Promise<ClubesSettings> {
    const { data } = await api.delete<ApiEnvelope<ClubesSettings>>(
      `/api/v1/settings/clubes/assets/${asset}`,
    )
    return data.data
  },
}
