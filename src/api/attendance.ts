import { api } from './client'
import { notifyAttendanceChanged } from './attendanceLive'
import type { ApiEnvelope, AttendanceEvent, AttendanceMemberHistory, AttendanceRanking, AttendanceRoster } from './types'

export const attendanceApi = {
  async events(): Promise<AttendanceEvent[]> {
    const { data } = await api.get<ApiEnvelope<AttendanceEvent[]>>(
      '/api/v1/settings/clubes/asistencia/eventos',
    )
    return data.data ?? []
  },

  async ranking(range?: { desde?: string; hasta?: string }): Promise<AttendanceRanking> {
    const { data } = await api.get<ApiEnvelope<AttendanceRanking>>(
      '/api/v1/settings/clubes/asistencia/resumen',
      { params: { desde: range?.desde || undefined, hasta: range?.hasta || undefined } },
    )
    return data.data ?? { eventos: 0, integrantes: [] }
  },

  async memberHistory(
    personaId: number,
    range?: { desde?: string; hasta?: string },
  ): Promise<AttendanceMemberHistory> {
    const { data } = await api.get<ApiEnvelope<AttendanceMemberHistory>>(
      `/api/v1/settings/clubes/asistencia/integrante/${personaId}`,
      { params: { desde: range?.desde || undefined, hasta: range?.hasta || undefined } },
    )
    return data.data
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
    puntuales: number[] = [],
  ): Promise<AttendanceRoster> {
    const { data } = await api.put<ApiEnvelope<AttendanceRoster>>(
      `/api/v1/settings/clubes/asistencia/${eventoId}`,
      { persona_ids: personaIds, justificados, puntuales },
    )
    notifyAttendanceChanged()
    return data.data
  },
}
