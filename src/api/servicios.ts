import { api } from './client'
import type {
  ApiEnvelope,
  ClubIcono,
  ClubServicio,
  EventoServicios,
  EventParticipantsRoster,
  EventSelfParticipation,
} from './types'

export type ClubServicioPayload = {
  nombre?: string
  descripcion?: string
  precio?: number
  activo?: boolean
  image?: File | null
  remove_image?: boolean
  icono?: string | null
}

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

function servicioFormData(payload: ClubServicioPayload): FormData {
  const body = new FormData()
  if (payload.nombre !== undefined) body.append('nombre', payload.nombre)
  if (payload.descripcion !== undefined) body.append('descripcion', payload.descripcion)
  if (payload.precio !== undefined) body.append('precio', String(payload.precio))
  if (payload.activo !== undefined) body.append('activo', payload.activo ? '1' : '0')
  if (payload.image) body.append('image', payload.image)
  if (payload.remove_image) body.append('remove_image', '1')
  if (payload.icono !== undefined) body.append('icono', payload.icono ?? '')
  return body
}

export const serviciosApi = {
  async iconos(): Promise<ClubIcono[]> {
    const { data } = await api.get<ApiEnvelope<ClubIcono[]>>('/api/v1/settings/clubes/servicios/iconos')
    return data.data ?? []
  },

  async list(options?: { activos?: boolean }): Promise<ClubServicio[]> {
    const { data } = await api.get<ApiEnvelope<ClubServicio[]>>('/api/v1/settings/clubes/servicios', {
      params: options?.activos ? { activos: 1 } : undefined,
    })
    return data.data ?? []
  },

  async create(payload: ClubServicioPayload): Promise<ClubServicio> {
    const { data } = await api.post<ApiEnvelope<ClubServicio>>(
      '/api/v1/settings/clubes/servicios',
      servicioFormData(payload),
      formDataRequest,
    )
    return data.data
  },

  async update(id: number, payload: ClubServicioPayload): Promise<ClubServicio> {
    const hasFile = Boolean(payload.image || payload.remove_image)
    const { data } = hasFile
      ? await api.post<ApiEnvelope<ClubServicio>>(
          `/api/v1/settings/clubes/servicios/${id}`,
          servicioFormData(payload),
          formDataRequest,
        )
      : await api.put<ApiEnvelope<ClubServicio>>(
          `/api/v1/settings/clubes/servicios/${id}`,
          Object.fromEntries(
            Object.entries({
              nombre: payload.nombre,
              descripcion: payload.descripcion,
              precio: payload.precio,
              activo: payload.activo,
              icono: payload.icono,
            }).filter(([, value]) => value !== undefined),
          ),
        )
    return data.data
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/api/v1/settings/clubes/servicios/${id}`)
  },

  async eventOffers(eventoId: number): Promise<EventoServicios> {
    const { data } = await api.get<ApiEnvelope<EventoServicios>>(
      `/api/v1/settings/clubes/events/${eventoId}/servicios`,
    )
    return data.data
  },

  async syncEventOffers(eventoId: number, productoServicioIds: number[]): Promise<EventoServicios> {
    const { data } = await api.put<ApiEnvelope<EventoServicios>>(
      `/api/v1/settings/clubes/events/${eventoId}/servicios`,
      { producto_servicio_ids: productoServicioIds },
    )
    return data.data
  },

  async participants(eventoId: number): Promise<EventParticipantsRoster> {
    const { data } = await api.get<ApiEnvelope<EventParticipantsRoster>>(
      `/api/v1/settings/clubes/events/${eventoId}/participantes`,
    )
    return data.data
  },

  async saveParticipants(
    eventoId: number,
    participantes: Array<{
      persona_id: number
      participa: boolean | null
      ventas: Array<{ producto_servicio_id: number; cantidad: number }>
    }>,
  ): Promise<EventParticipantsRoster> {
    const { data } = await api.put<ApiEnvelope<EventParticipantsRoster>>(
      `/api/v1/settings/clubes/events/${eventoId}/participantes`,
      { participantes },
    )
    return data.data
  },

  async myParticipation(eventoId: number): Promise<EventSelfParticipation> {
    const { data } = await api.get<ApiEnvelope<EventSelfParticipation>>(
      `/api/v1/settings/clubes/events/${eventoId}/participantes/yo`,
    )
    return data.data
  },

  async saveMyParticipation(
    eventoId: number,
    payload: {
      participa: boolean
      ventas: Array<{ producto_servicio_id: number; cantidad: number }>
    },
  ): Promise<EventSelfParticipation> {
    const { data } = await api.put<ApiEnvelope<EventSelfParticipation>>(
      `/api/v1/settings/clubes/events/${eventoId}/participantes/yo`,
      payload,
    )
    return data.data
  },
}
