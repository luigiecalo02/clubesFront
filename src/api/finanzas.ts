import { api } from './client'
import { notifyFinanzasChanged } from './finanzasLive'
import type {
  ApiEnvelope,
  FinanzasDistribucionDetalle,
  FinanzasInformeLink,
  FinanzasResumen,
  FinanzasMovimiento,
  InformeParticipanteDetalle,
  InformeParticipantesPublico,
} from './types'

export const finanzasApi = {
  async resumen(params?: {
    desde?: string | null
    hasta?: string | null
    cuentaBancariaId?: number | null
  }): Promise<FinanzasResumen> {
    const { data } = await api.get<ApiEnvelope<FinanzasResumen>>('/api/v1/settings/clubes/finanzas', {
      params: {
        desde: params?.desde || undefined,
        hasta: params?.hasta || undefined,
        cuenta_bancaria_id: params?.cuentaBancariaId || undefined,
      },
    })
    return data.data
  },

  async detalleDistribucion(params: {
    destino: string
    desde?: string | null
    hasta?: string | null
    cuentaBancariaId?: number | null
    personaId?: number | null
  }): Promise<FinanzasDistribucionDetalle> {
    const { data } = await api.get<ApiEnvelope<FinanzasDistribucionDetalle>>(
      `/api/v1/settings/clubes/finanzas/distribucion/${params.destino}`,
      {
        params: {
          desde: params.desde || undefined,
          hasta: params.hasta || undefined,
          cuenta_bancaria_id: params.cuentaBancariaId || undefined,
          persona_id: params.personaId || undefined,
        },
      },
    )
    return data.data
  },

  async storeMovimiento(payload: {
    cuenta_bancaria_id: number
    cuenta_destino_id?: number | null
    tipo: 'ingreso' | 'egreso' | 'transferencia'
    origen?: 'manual' | 'gasto' | 'ajuste' | 'transferencia'
    monto: number
    concepto: string
    destino?: string | null
    evento_id?: number | null
    persona_id?: number | null
    occurred_at?: string | null
  }): Promise<FinanzasMovimiento> {
    const { data } = await api.post<ApiEnvelope<FinanzasMovimiento>>(
      '/api/v1/settings/clubes/finanzas/movimientos',
      payload,
    )
    notifyFinanzasChanged()
    return data.data
  },

  async deleteMovimiento(id: number): Promise<void> {
    await api.delete(`/api/v1/settings/clubes/finanzas/movimientos/${id}`)
    notifyFinanzasChanged()
  },

  async publishInforme(payload: {
    desde: string
    hasta: string
    origin?: string
  }): Promise<FinanzasInformeLink> {
    const { data } = await api.post<ApiEnvelope<FinanzasInformeLink>>(
      '/api/v1/settings/clubes/finanzas/informes-participantes',
      {
        desde: payload.desde,
        hasta: payload.hasta,
        origin: payload.origin || window.location.origin,
      },
    )
    return data.data
  },

  async setInformeActivo(id: number, activo: boolean): Promise<{ id: number; activo: boolean }> {
    const { data } = await api.patch<ApiEnvelope<{ id: number; activo: boolean }>>(
      `/api/v1/settings/clubes/finanzas/informes-participantes/${id}`,
      { activo },
    )
    return data.data
  },

  async informePublico(token: string): Promise<InformeParticipantesPublico> {
    const { data } = await api.get<ApiEnvelope<InformeParticipantesPublico>>(
      `/api/v1/settings/clubes/public/informe-participantes/${encodeURIComponent(token)}`,
    )
    return data.data
  },

  async informePersona(token: string, personaId: number): Promise<InformeParticipanteDetalle> {
    const { data } = await api.get<ApiEnvelope<InformeParticipanteDetalle>>(
      `/api/v1/settings/clubes/public/informe-participantes/${encodeURIComponent(token)}/personas/${personaId}`,
    )
    return data.data
  },
}
