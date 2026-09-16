import { api } from './client'
import type { ApiEnvelope, EventSummary, EventTipo } from './types'

export type CreateEventPayload = {
  name: string
  descripcion?: string
  lugar?: string
  starts_at: string
  ends_at: string
  tipo_evento_id?: number | null
  evento_padre_id?: number | null
  logo?: File | null
  banner?: File | null
  remove_logo?: boolean
  remove_banner?: boolean
}

function eventFormData(payload: CreateEventPayload): FormData {
  const body = new FormData()
  body.append('name', payload.name)
  body.append('descripcion', payload.descripcion ?? '')
  body.append('lugar', payload.lugar ?? '')
  body.append('starts_at', payload.starts_at)
  body.append('ends_at', payload.ends_at)
  if (payload.tipo_evento_id) body.append('tipo_evento_id', String(payload.tipo_evento_id))
  if (payload.evento_padre_id) body.append('evento_padre_id', String(payload.evento_padre_id))
  if (payload.logo) body.append('logo', payload.logo)
  if (payload.banner) body.append('banner', payload.banner)
  if (payload.remove_logo) body.append('remove_logo', '1')
  if (payload.remove_banner) body.append('remove_banner', '1')
  return body
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

async function fetchEvents(params: Record<string, number> = {}): Promise<EventSummary[]> {
  const { data } = await api.get<ApiEnvelope<EventSummary[]>>('/api/v1/events', {
    params: { solo_raiz: 1, per_page: 200, ...params },
  })
  return data.data ?? []
}

export const eventsApi = {
  async upcoming(): Promise<EventSummary[]> {
    return fetchEvents({ proximos: 1 })
  },

  async list(): Promise<EventSummary[]> {
    return fetchEvents()
  },

  async children(parentId: number): Promise<EventSummary[]> {
    const { data } = await api.get<ApiEnvelope<EventSummary[]>>('/api/v1/events', {
      params: { evento_padre_id: parentId, per_page: 200 },
    })
    return data.data ?? []
  },

  async tipos(): Promise<EventTipo[]> {
    const { data } = await api.get<ApiEnvelope<EventTipo[]>>('/api/v1/events/tipos')
    return data.data ?? []
  },

  async create(payload: CreateEventPayload): Promise<EventSummary> {
    const { data } = await api.post<ApiEnvelope<EventSummary>>(
      '/api/v1/settings/clubes/events',
      eventFormData(payload),
      formDataRequest,
    )
    return data.data
  },

  async update(id: number, payload: CreateEventPayload): Promise<EventSummary> {
    const { data } = await api.post<ApiEnvelope<EventSummary>>(
      `/api/v1/settings/clubes/events/${id}`,
      eventFormData(payload),
      formDataRequest,
    )
    return data.data
  },
}
