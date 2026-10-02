import { api } from './client'
import type { ApiEnvelope, EventSummary } from './types'

export type InscripcionIntegrante = {
  persona_id: number
  full_name: string
  identificacion?: string | null
  foto_url?: string | null
  inscrito: boolean
  origen?: 'club' | 'externo'
  organizacion?: string | null
}

export type InscripcionRoster = {
  evento: EventSummary
  integrantes: InscripcionIntegrante[]
  candidatos?: InscripcionIntegrante[]
  resumen: { total: number; inscritos: number; sin_inscribir?: number; externos?: number }
}

export type InscripcionYo = {
  evento: EventSummary
  inscrito: boolean
}

export const inscripcionesApi = {
  async show(eventoId: number): Promise<InscripcionRoster> {
    const { data } = await api.get<ApiEnvelope<InscripcionRoster>>(
      `/api/v1/settings/clubes/inscripciones/${eventoId}`,
    )
    return data.data
  },

  async sync(eventoId: number, personaIds: number[]): Promise<InscripcionRoster> {
    const { data } = await api.put<ApiEnvelope<InscripcionRoster>>(
      `/api/v1/settings/clubes/inscripciones/${eventoId}`,
      { persona_ids: personaIds },
    )
    return data.data
  },

  async me(eventoId: number): Promise<InscripcionYo> {
    const { data } = await api.get<ApiEnvelope<InscripcionYo>>(
      `/api/v1/settings/clubes/inscripciones/${eventoId}/yo`,
    )
    return data.data
  },

  async join(eventoId: number, inscrito: boolean): Promise<InscripcionYo> {
    const { data } = await api.put<ApiEnvelope<InscripcionYo>>(
      `/api/v1/settings/clubes/inscripciones/${eventoId}/yo`,
      { inscrito },
    )
    return data.data
  },
}
