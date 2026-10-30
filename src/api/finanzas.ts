import { api } from './client'
import { notifyFinanzasChanged } from './finanzasLive'
import type { ApiEnvelope, FinanzasResumen, FinanzasMovimiento } from './types'

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
}
