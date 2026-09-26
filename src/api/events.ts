import { api } from './client'
import type { ApiEnvelope, EventSummary, EventTipo } from './types'

export type CreateEventPayload = {
  name: string
  descripcion?: string
  lugar?: string
  starts_at: string
  ends_at: string
  tipo_evento_id?: number | null
  estado?: string
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
  if (payload.estado) body.append('estado', payload.estado)
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

export type EventListQuery = {
  proximos?: boolean
  estado?: string
  tipo_evento_id?: number
  desde?: string
  hasta?: string
}

function formatDateInput(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

export function endOfMonthDate(isoDate: string): string {
  const [year, month] = isoDate.split('-').map(Number)
  if (!year || !month) return isoDate
  return formatDateInput(new Date(year, month, 0))
}

export function defaultEventDateRange(now = new Date()): { desde: string; hasta: string } {
  const desde = formatDateInput(now)
  return { desde, hasta: endOfMonthDate(desde) }
}

export function buildEventListQuery(filters: {
  estado?: string
  tipo?: string
  desde?: string
  hasta?: string
}): EventListQuery {
  const defaults = defaultEventDateRange()
  const estado = filters.estado?.trim() ?? ''
  const tipo = Number(filters.tipo)
  const desde = filters.desde?.trim() || defaults.desde
  const hasta = filters.hasta?.trim() || defaults.hasta
  const hasEstado = estado !== '' && estado !== 'vigentes'
  const query: EventListQuery = { desde, hasta }

  if (hasEstado && estado !== 'todos') query.estado = estado
  if (Number.isInteger(tipo) && tipo > 0) query.tipo_evento_id = tipo
  if (!hasEstado) query.proximos = true

  return query
}

async function fetchEvents(query: EventListQuery = {}): Promise<EventSummary[]> {
  const params: Record<string, string | number> = { solo_raiz: 1, per_page: 200 }
  if (query.proximos) params.proximos = 1
  if (query.estado) params.estado = query.estado
  if (query.tipo_evento_id) params.tipo_evento_id = query.tipo_evento_id
  if (query.desde) params.desde = query.desde
  if (query.hasta) params.hasta = query.hasta

  const { data } = await api.get<ApiEnvelope<EventSummary[]>>('/api/v1/events', { params })
  return data.data ?? []
}

export const eventsApi = {
  async upcoming(): Promise<EventSummary[]> {
    return fetchEvents({ proximos: true })
  },

  async list(query: EventListQuery = {}): Promise<EventSummary[]> {
    return fetchEvents(query)
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
