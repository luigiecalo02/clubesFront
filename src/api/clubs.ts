import { api } from './client'
import type { ApiEnvelope, ClubDetail, ClubDirectorAssignment } from './types'

export const clubsApi = {
  async current(): Promise<ClubDetail> {
    const { data } = await api.get<ApiEnvelope<ClubDetail>>('/api/v1/clubs/current')
    return data.data
  },

  async updateDirectors(
    clubId: number,
    directors: Record<string, ClubDirectorAssignment>,
  ): Promise<ClubDetail> {
    const { data } = await api.put<ApiEnvelope<ClubDetail>>(`/api/v1/clubs/${clubId}/directors`, {
      directors,
    })
    return data.data
  },
}
