import { api } from './client'
import type {
  AbonoActividadDistribucion,
  AbonoRecaudo,
  AbonoRevision,
  AbonosBoard,
  AbonosModo,
  ApiEnvelope,
} from './types'

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

  async distribucion(eventoId: number, personaId?: number | null): Promise<AbonoActividadDistribucion> {
    const { data } = await api.get<ApiEnvelope<AbonoActividadDistribucion>>(
      '/api/v1/settings/clubes/abonos/distribucion',
      {
        params: {
          evento_id: eventoId,
          persona_id: personaId || undefined,
        },
      },
    )
    return data.data
  },

  async store(payload: {
    evento_id: number
    persona_id: number
    monto?: number
    nota?: string
    modo: AbonosModo
    producto_servicio_id?: number | null
    partidas?: Array<{ producto_servicio_id: number; monto: number }>
    comprobante?: File | null
  }): Promise<AbonosBoard> {
    const { comprobante, partidas, ...fields } = payload
    if (!comprobante) {
      const { data } = await api.post<ApiEnvelope<AbonosBoard>>('/api/v1/settings/clubes/abonos', {
        ...fields,
        partidas,
      })
      return data.data
    }
    const body = new FormData()
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) body.append(key, String(value))
    })
    if (partidas?.length) body.append('partidas', JSON.stringify(partidas))
    body.append('comprobante', comprobante)
    const { data } = await api.post<ApiEnvelope<AbonosBoard>>(
      '/api/v1/settings/clubes/abonos',
      body,
      formDataRequest,
    )
    return data.data
  },

  async submitComprobante(
    eventoId: number,
    comprobante: File,
    partidas?: Array<{ producto_servicio_id: number; monto: number }>,
  ): Promise<AbonoRecaudo> {
    const body = new FormData()
    body.append('evento_id', String(eventoId))
    if (partidas?.length) body.append('partidas', JSON.stringify(partidas))
    body.append('comprobante', comprobante)
    const { data } = await api.post<ApiEnvelope<AbonoRecaudo>>(
      '/api/v1/settings/clubes/abonos/comprobante',
      body,
      formDataRequest,
    )
    return data.data
  },

  async attachComprobante(
    abonoId: number,
    comprobante: File,
    ids: number[] = [],
  ): Promise<AbonoRevision> {
    const body = new FormData()
    body.append('comprobante', comprobante)
    ids.forEach((id) => body.append('ids[]', String(id)))
    const { data } = await api.post<ApiEnvelope<AbonoRevision>>(
      `/api/v1/settings/clubes/abonos/${abonoId}/comprobante`,
      body,
      formDataRequest,
    )
    return data.data
  },

  async updateMonto(abonoId: number, monto: number): Promise<AbonoRevision> {
    const { data } = await api.patch<ApiEnvelope<AbonoRevision>>(
      `/api/v1/settings/clubes/abonos/${abonoId}`,
      { monto },
    )
    return data.data
  },

  async review(
    abonoId: number,
    payload: { estado: 'aprobado' | 'rechazado' | 'eliminado'; monto?: number },
  ): Promise<AbonoRevision> {
    const { data } = await api.patch<ApiEnvelope<AbonoRevision>>(
      `/api/v1/settings/clubes/abonos/${abonoId}/revision`,
      payload,
    )
    return data.data
  },
}
