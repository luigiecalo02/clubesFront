import { useEffect, useState } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { settingsApi } from '../api/settings'
import type { ClubesInvitePreview } from '../api/types'
import { SESSION_HOME } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import { AdventureScene } from '../components/login/AdventureScene'
import { LoginCardEmblem } from '../components/login/LoginCardEmblem'
import { RegisterCard } from '../components/login/RegisterCard'
import { usePublicClubBranding } from '../settings/usePublicClubBranding'
import { AppPanel } from '../theme/AppPanel'
import { SceneThemeToggle } from '../theme/SceneThemeToggle'
import { useSceneTheme } from '../theme/sceneTheme'

export function ActivateAccountPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const { theme, toggleTheme } = useSceneTheme()
  const [preview, setPreview] = useState<ClubesInvitePreview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const { logoUrl, backgroundUrl, backgroundStyle } = usePublicClubBranding(preview?.organizacion_id)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Falta el enlace del director.')
      return
    }
    let cancelled = false
    settingsApi
      .invitePreview(token)
      .then((next) => {
        if (!cancelled) setPreview(next)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'El enlace no está habilitado o ya no es válido'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (auth.user && !auth.loading) {
    return <Navigate to={auth.requiresContext ? '/contexto' : SESSION_HOME} replace />
  }

  return (
    <AdventureScene theme={theme} showCopy={false} backgroundUrl={backgroundUrl} backgroundStyle={backgroundStyle}>
      <SceneThemeToggle theme={theme} onToggle={toggleTheme} />
      <div className="login-scene__content login-scene__content--form">
        {loading ? (
          <AppPanel className="login-card login-card--register">
            <LoginCardEmblem logoUrl={logoUrl} />
            <p className="app-panel__muted">Revisando el enlace…</p>
          </AppPanel>
        ) : null}

        {!loading && (error || !preview) ? (
          <AppPanel className="login-card login-card--register">
            <LoginCardEmblem logoUrl={logoUrl} />
            <p className="login-card__kicker">Inscripción</p>
            <h1>Enlace no disponible</h1>
            <p className="login-card__subtitle">
              El director debe habilitar el enlace de inscripción en Mi club para que puedas crear tu cuenta.
            </p>
            {error ? (
              <p className="login-card__alert" role="alert">
                {error}
              </p>
            ) : null}
            <div className="login-card__links">
              <Link className="login-card__link" to="/login">
                Ir a iniciar sesión
              </Link>
            </div>
          </AppPanel>
        ) : null}

        {!loading && preview ? (
          <RegisterCard
            logoUrl={logoUrl}
            token={token}
            preview={preview}
            onCancel={() => navigate('/login')}
          />
        ) : null}
      </div>
    </AdventureScene>
  )
}
