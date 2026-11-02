import { api } from './client'
import type { ApiEnvelope } from './types'

export type ClubNotificationItem = {
  id: string
  tipo: string | null
  title: string
  body: string
  url: string
  icon: string
  read_at: string | null
  created_at: string | null
  data?: Record<string, unknown>
}

export type ClubNotificationList = {
  items: ClubNotificationItem[]
  unread_count: number
}

export type ClubNotificationSetting = {
  tipo: string
  label: string
  description: string
  audience: string
  activo: boolean
}

export const notificationsApi = {
  async vapidKey(): Promise<string> {
    const { data } = await api.get<ApiEnvelope<{ public_key: string }>>('/api/v1/push/vapid-key')
    return data.data?.public_key ?? ''
  },

  async subscribe(subscription: PushSubscriptionJSON): Promise<void> {
    await api.post('/api/v1/push/subscriptions', {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      contentEncoding: 'aesgcm',
    })
  },

  async unsubscribe(endpoint: string): Promise<void> {
    await api.delete('/api/v1/push/subscriptions', { data: { endpoint } })
  },

  async list(page = 1): Promise<ClubNotificationList> {
    const { data } = await api.get<ApiEnvelope<ClubNotificationList>>('/api/v1/notifications', {
      params: { page, per_page: 20 },
    })
    return data.data ?? { items: [], unread_count: 0 }
  },

  async markRead(id: string): Promise<ClubNotificationList> {
    const { data } = await api.patch<ApiEnvelope<{ item: ClubNotificationItem; unread_count: number }>>(
      `/api/v1/notifications/${id}/read`,
    )
    return {
      items: data.data?.item ? [data.data.item] : [],
      unread_count: data.data?.unread_count ?? 0,
    }
  },

  async markAllRead(): Promise<void> {
    await api.post('/api/v1/notifications/read-all')
  },

  async settings(): Promise<ClubNotificationSetting[]> {
    const { data } = await api.get<ApiEnvelope<{ tipos: ClubNotificationSetting[] }>>(
      '/api/v1/settings/clubes/notificaciones',
    )
    return data.data?.tipos ?? []
  },

  async updateSetting(tipo: string, activo: boolean): Promise<ClubNotificationSetting> {
    const { data } = await api.put<ApiEnvelope<ClubNotificationSetting>>(
      `/api/v1/settings/clubes/notificaciones/${tipo}`,
      { activo },
    )
    return data.data as ClubNotificationSetting
  },
}
