import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { settingsApi } from '../api/settings'
import type { ClubesAppConfig, ClubesAssetKey, ClubesSettings } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { applySceneTheme } from '../theme/sceneTheme'

type ClubesSettingsContextValue = {
  settings: ClubesSettings | null
  loading: boolean
  hasOrgSettings: boolean
  refresh: () => Promise<void>
  update: (payload: Omit<ClubesAppConfig, 'source'>) => Promise<ClubesSettings>
  uploadAsset: (asset: ClubesAssetKey, file: File) => Promise<ClubesSettings>
  resetAsset: (asset: ClubesAssetKey) => Promise<ClubesSettings>
}

const ClubesSettingsContext = createContext<ClubesSettingsContextValue | null>(null)

export function ClubesSettingsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const [settings, setSettings] = useState<ClubesSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const appliedOrg = useRef<number | 'platform' | null>(null)
  const orgKey = auth.user?.contexto?.organizacion_id ?? (auth.user ? 'platform' : null)

  const refresh = useCallback(async () => {
    if (!auth.token || !auth.user || auth.requiresContext) {
      setSettings(null)
      appliedOrg.current = null
      return
    }

    setLoading(true)
    setSettings(null)
    try {
      const next = await settingsApi.show()
      setSettings(next)
      if (!next) {
        appliedOrg.current = null
        return
      }
      const key = next.organizacion_id ?? 'platform'
      if (appliedOrg.current !== key) {
        appliedOrg.current = key
        applySceneTheme(next.clubes.scene_theme)
      }
    } catch {
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [auth.requiresContext, auth.token, auth.user])

  useEffect(() => {
    void refresh()
  }, [orgKey, refresh])

  const update = useCallback(async (payload: Omit<ClubesAppConfig, 'source'>) => {
    const next = await settingsApi.update(payload)
    setSettings(next)
    applySceneTheme(next.clubes.scene_theme)
    return next
  }, [])

  const uploadAsset = useCallback(async (asset: ClubesAssetKey, file: File) => {
    const next = await settingsApi.uploadAsset(asset, file)
    setSettings(next)
    return next
  }, [])

  const resetAsset = useCallback(async (asset: ClubesAssetKey) => {
    const next = await settingsApi.resetAsset(asset)
    setSettings(next)
    return next
  }, [])

  const hasOrgSettings = Boolean(settings?.organizacion_id && settings.clubes)

  const value = useMemo<ClubesSettingsContextValue>(
    () => ({ settings, loading, hasOrgSettings, refresh, update, uploadAsset, resetAsset }),
    [hasOrgSettings, loading, refresh, resetAsset, settings, update, uploadAsset],
  )

  return <ClubesSettingsContext.Provider value={value}>{children}</ClubesSettingsContext.Provider>
}

export function useClubesSettings(): ClubesSettingsContextValue {
  const ctx = useContext(ClubesSettingsContext)
  if (!ctx) {
    throw new Error('useClubesSettings debe usarse dentro de ClubesSettingsProvider')
  }
  return ctx
}
