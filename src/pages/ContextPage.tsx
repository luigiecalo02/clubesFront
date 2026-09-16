import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import type { AuthContextOption } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { AppPanel } from '../theme/AppPanel'
import { useNotice } from '../theme/NoticeProvider'

export function ContextPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [options, setOptions] = useState<AuthContextOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const notices = useNotice()

  const userId = auth.user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    authApi
      .contextOptions()
      .then((result) => {
        if (cancelled) return
        setOptions(result.options)
        if (result.options.length <= 1) {
          navigate('/', { replace: true })
        }
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [navigate, userId])

  if (auth.loading) {
    return <p className="page-status">Cargando sesión…</p>
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />
  }

  async function choose(option: AuthContextOption) {
    setSaving(option.key)
    try {
      const user = await authApi.setContext({
        organizacion_id: option.organizacion_id,
        rol_id: option.rol_id,
      })
      auth.applyUser(user)
      navigate('/', { replace: true })
    } catch (err) {
      notices.error(getApiErrorMessage(err))
    } finally {
      setSaving(null)
    }
  }

  return (
    <AppPanel className="auth-card" narrow>
      <p className="app-panel__kicker">Clubes</p>
      <h1 className="app-panel__title">Elige un contexto</h1>
      <p className="app-panel__subtitle">Cambia de rol u organización sin cerrar sesión.</p>
      {loading ? <p className="app-panel__muted">Cargando opciones…</p> : null}
      <ul className="context-list">
        {options.map((option) => (
          <li key={option.key}>
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => void choose(option)}
            >
              <strong>{option.organizacion_nombre}</strong>
              <span>{option.rol_display_name || option.rol_name}</span>
              {saving === option.key ? <em>Guardando…</em> : null}
            </button>
          </li>
        ))}
      </ul>
    </AppPanel>
  )
}
