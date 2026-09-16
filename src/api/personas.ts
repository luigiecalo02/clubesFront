import { api } from './client'
import type { ApiEnvelope, ClubPerson, CreatePersonaPayload } from './types'

export const personasApi = {
  async list(params: { q?: string; organizacionId?: number | null } = {}): Promise<ClubPerson[]> {
    const { data } = await api.get<ApiEnvelope<ClubPerson[]>>('/api/v1/personas', {
      params: {
        solo_tipo_club: 1,
        per_page: 200,
        q: params.q || undefined,
        organizacion_id: params.organizacionId || undefined,
      },
    })
    return data.data ?? []
  },

  async show(id: number): Promise<ClubPerson> {
    const { data } = await api.get<ApiEnvelope<ClubPerson>>(`/api/v1/personas/${id}`)
    return data.data
  },

  async create(payload: CreatePersonaPayload): Promise<ClubPerson> {
    const { data } = await api.post<ApiEnvelope<ClubPerson>>('/api/v1/personas', payload)
    return data.data
  },

  async update(id: number, payload: Partial<CreatePersonaPayload>): Promise<ClubPerson> {
    const { data } = await api.put<ApiEnvelope<ClubPerson>>(`/api/v1/personas/${id}`, payload)
    return data.data
  },

  async updatePassword(
    id: number,
    payload: { password: string; password_confirmation: string },
  ): Promise<void> {
    await api.put(`/api/v1/personas/${id}/password`, payload)
  },

  async uploadFoto(id: number, file: File): Promise<ClubPerson> {
    const body = new FormData()
    body.append('foto', file)
    const { data } = await api.post<ApiEnvelope<ClubPerson>>(`/api/v1/personas/${id}/foto`, body, {
      transformRequest: [
        (value, headers) => {
          if (value instanceof FormData) {
            delete headers['Content-Type']
          }
          return value
        },
      ],
    })
    return data.data
  },

  async deleteFoto(id: number): Promise<ClubPerson> {
    const { data } = await api.delete<ApiEnvelope<ClubPerson>>(`/api/v1/personas/${id}/foto`)
    return data.data
  },
}
