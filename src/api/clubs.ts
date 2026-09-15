import { api } from './client'
import type { ApiEnvelope, ClubDetail } from './types'

export const clubsApi = {
  async current(): Promise<ClubDetail> {
    const { data } = await api.get<ApiEnvelope<ClubDetail>>('/api/v1/clubs/current')
    return data.data
  },
}
