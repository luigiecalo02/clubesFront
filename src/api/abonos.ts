import { api } from './client'
import type { AbonoRecaudo, AbonoRevision, AbonosBoard, AbonosModo, ApiEnvelope } from './types'

const formDataRequest = {
  transformRequest: [
    (value: unknown, headers: Record<string, unknown>) => {
      if (value instanceof FormData) {
        delete headers['Content-Type']
      }
      return value
    },
  ],
}

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
    comprobante?: File | null
  }): Promise<AbonosBoard> {
    const { comprobante, ...fields } = payload
    if (!comprobante) {
      const { data } = await api.post<ApiEnvelope<AbonosBoard>>('/api/v1/settings/clubes/abonos', fields)
      return data.data
    }
    const body = new FormData()
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) body.append(key, String(value))
    })
    body.append('comprobante', comprobante)
    const { data } = await api.post<ApiEnvelope<AbonosBoard>>(
      '/api/v1/settings/clubes/abonos',
      body,
      formDataRequest,
    )
    return data.data
  },

  async submitComprobante(eventoId: number, comprobante: File): Promise<AbonoRecaudo> {
    const body = new FormData()
    body.append('evento_id', String(eventoId))
    body.append('comprobante', comprobante)
    const { data } = await api.post<ApiEnvelope<AbonoRecaudo>>(
      '/api/v1/settings/clubes/abonos/comprobante',
      body,
      formDataRequest,
    )
    return data.data
  },

  async review(
    abonoId: number,
    payload: { estado: 'aprobado' | 'rechazado'; monto?: number },
  ): Promise<AbonoRevision> {
    const { data } = await api.patch<ApiEnvelope<AbonoRevision>>(
      `/api/v1/settings/clubes/abonos/${abonoId}/revision`,
      payload,
    )
    return data.data
  },
}
