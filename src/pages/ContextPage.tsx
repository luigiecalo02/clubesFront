import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import type { AuthContextOption } from '../api/types'
import { useAuth } from '../auth/AuthProvider'

export function ContextPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [options, setOptions] = useState<AuthContextOption[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const userId = auth.user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    authApi
      .contextOptions()
      .then((result) => {
        if (cancelled) return
        setOptions(result.options)
        if (!result.requires_context) {
          navigate('/', { replace: true })
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err))
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
    setError('')
    setSaving(option.key)
    try {
      const user = await authApi.setContext({
        organizacion_id: option.organizacion_id,
        rol_id: option.rol_id,
      })
      auth.applyUser(user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="auth-card">
      <p className="kicker">Clubes</p>
      <h1>Elige un contexto</h1>
      <p className="muted">Tu usuario tiene más de un rol u organización.</p>
      {error ? <p className="alert">{error}</p> : null}
      {loading ? <p className="muted">Cargando opciones…</p> : null}
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
    </section>
  )
}
