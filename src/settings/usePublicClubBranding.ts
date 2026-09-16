import { useEffect, useState } from 'react'
import { resolveClubRootId, resolveFileUrl } from '../api/baseUrl'
import { settingsApi } from '../api/settings'
import { DEFAULT_LOGIN_BRANDING, type ClubesPublicBranding } from '../api/types'

export function usePublicClubBranding(organizacionId?: number | null) {
  const [branding, setBranding] = useState<ClubesPublicBranding>(DEFAULT_LOGIN_BRANDING)

  useEffect(() => {
    const orgId = organizacionId && organizacionId > 0 ? organizacionId : resolveClubRootId()
    let cancelled = false
    settingsApi
      .publicBranding(orgId)
      .then((next) => {
        if (!cancelled) setBranding(next)
      })
      .catch(() => {
        if (!cancelled) setBranding(DEFAULT_LOGIN_BRANDING)
      })
    return () => {
      cancelled = true
    }
  }, [organizacionId])

  return {
    branding,
    logoUrl: resolveFileUrl(branding.clubes.logo_url || branding.logo_url),
    backgroundUrl: resolveFileUrl(branding.background_url || branding.clubes.background_url),
    backgroundStyle: branding.clubes.background_style,
  }
}
