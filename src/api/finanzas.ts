import { api } from './client'
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
    tipo: 'ingreso' | 'egreso'
    origen?: 'manual' | 'gasto' | 'ajuste'
    monto: number
    concepto: string
    evento_id?: number | null
    occurred_at?: string | null
  }): Promise<FinanzasMovimiento> {
    const { data } = await api.post<ApiEnvelope<FinanzasMovimiento>>(
      '/api/v1/settings/clubes/finanzas/movimientos',
      payload,
    )
    return data.data
  },

  async deleteMovimiento(id: number): Promise<void> {
    await api.delete(`/api/v1/settings/clubes/finanzas/movimientos/${id}`)
  },
}
