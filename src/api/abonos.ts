import { api } from './client'
import type { AbonosBoard, AbonosModo, ApiEnvelope } from './types'

export const abonosApi = {
  async board(params: {
    modo: AbonosModo
    personaId?: number | null
    eventoId?: number | null
  }): Promise<AbonosBoard> {
    const { data } = await api.get<ApiEnvelope<AbonosBoard>>('/api/v1/settings/clubes/abonos', {
      params: {
        modo: params.modo,
        persona_id: params.personaId || undefined,
        evento_id: params.eventoId || undefined,
      },
    })
    return data.data
  },

  async store(payload: {
    evento_id: number
    persona_id: number
    monto: number
    nota?: string
    modo: AbonosModo
  }): Promise<AbonosBoard> {
    const { data } = await api.post<ApiEnvelope<AbonosBoard>>('/api/v1/settings/clubes/abonos', payload)
    return data.data
  },
}
