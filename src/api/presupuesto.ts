import { api } from './client'
import type {
  ApiEnvelope,
  PresupuestoDestinatario,
  PresupuestoDetalle,
  PresupuestoEvento,
  PresupuestoTipo,
} from './types'

export type PresupuestoSavePayload = {
  presupuesto_id?: number | null
  nombre?: string
  activo?: boolean
  acompanantes_count: number
  items: Array<{
    concepto: string
    tipo: PresupuestoTipo
    monto: number
    destinatario: PresupuestoDestinatario
    orden?: number
  }>
}

export const presupuestoApi = {
  async eventos(): Promise<PresupuestoEvento[]> {
    const { data } = await api.get<ApiEnvelope<PresupuestoEvento[]>>(
      '/api/v1/settings/clubes/presupuesto/eventos',
    )
    return data.data
  },

  async show(eventoId: number, presupuestoId?: number | null): Promise<PresupuestoDetalle> {
    const { data } = await api.get<ApiEnvelope<PresupuestoDetalle>>(
      `/api/v1/settings/clubes/presupuesto/${eventoId}`,
      { params: { presupuesto_id: presupuestoId || undefined } },
    )
    return data.data
  },

  async save(eventoId: number, payload: PresupuestoSavePayload): Promise<PresupuestoDetalle> {
    const { data } = await api.put<ApiEnvelope<PresupuestoDetalle>>(
      `/api/v1/settings/clubes/presupuesto/${eventoId}`,
      payload,
    )
    return data.data
  },

  async remove(eventoId: number, presupuestoId: number): Promise<PresupuestoDetalle> {
    const { data } = await api.delete<ApiEnvelope<PresupuestoDetalle>>(
      `/api/v1/settings/clubes/presupuesto/${eventoId}/${presupuestoId}`,
    )
    return data.data
  },
}
