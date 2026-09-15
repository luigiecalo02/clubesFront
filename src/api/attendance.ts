import { api } from './client'
import type { ApiEnvelope, AttendanceEvent, AttendanceRanking, AttendanceRoster } from './types'

export const attendanceApi = {
  async events(): Promise<AttendanceEvent[]> {
    const { data } = await api.get<ApiEnvelope<AttendanceEvent[]>>(
      '/api/v1/settings/clubes/asistencia/eventos',
    )
    return data.data ?? []
  },

  async ranking(): Promise<AttendanceRanking> {
    const { data } = await api.get<ApiEnvelope<AttendanceRanking>>(
      '/api/v1/settings/clubes/asistencia/resumen',
    )
    return data.data ?? { eventos: 0, integrantes: [] }
  },

  async roster(eventoId: number): Promise<AttendanceRoster> {
    const { data } = await api.get<ApiEnvelope<AttendanceRoster>>(
      `/api/v1/settings/clubes/asistencia/${eventoId}`,
    )
    return data.data
  },

  async save(
    eventoId: number,
    personaIds: number[],
    justificados: number[] = [],
  ): Promise<AttendanceRoster> {
    const { data } = await api.put<ApiEnvelope<AttendanceRoster>>(
      `/api/v1/settings/clubes/asistencia/${eventoId}`,
      { persona_ids: personaIds, justificados },
    )
    return data.data
  },
}
