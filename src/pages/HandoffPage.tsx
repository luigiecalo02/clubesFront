import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { AdventureScene } from '../components/login/AdventureScene'
import { LoginCardEmblem } from '../components/login/LoginCardEmblem'
import { usePublicClubBranding } from '../settings/usePublicClubBranding'
import { AppPanel } from '../theme/AppPanel'
import { SceneThemeToggle } from '../theme/SceneThemeToggle'
import { useSceneTheme } from '../theme/sceneTheme'

export function HandoffPage() {
  const auth = useAuth()
  const [params] = useSearchParams()
  const { theme, toggleTheme } = useSceneTheme()
  const code = params.get('code') ?? ''
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(code))
  const { logoUrl, backgroundUrl, backgroundStyle } = usePublicClubBranding()

  const applySession = auth.applySession

  useEffect(() => {
    if (!code) {
      setLoading(false)
      setError('Falta el código para entrar a este club.')
      return
    }

    let cancelled = false
    authApi
      .consumeHandoff(code)
      .then((result) => {
        if (cancelled) return
        return applySession(result.token, result.user)
      })
      .then((user) => {
        if (cancelled || !user) return
        window.location.replace(user.requires_context ? '/contexto' : '/')
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'El enlace para cambiar de club expiró'))
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [applySession, code])

  return (
    <AdventureScene theme={theme} showCopy={false} backgroundUrl={backgroundUrl} backgroundStyle={backgroundStyle}>
      <SceneThemeToggle theme={theme} onToggle={toggleTheme} />
      <div className="login-scene__content">
        <AppPanel className="login-card" narrow>
          <LoginCardEmblem logoUrl={logoUrl} />
          <p className="login-card__kicker">Clubes</p>
          <h1>Abrir este club</h1>
          <p className="login-card__subtitle">
            {loading
              ? 'Estamos abriendo tu sesión en este club…'
              : error
                ? 'No se pudo completar el salto. Vuelve al club anterior y elige el rol otra vez.'
                : 'Ya puedes continuar.'}
          </p>
          {error ? (
            <p className="login-card__alert" role="alert">
              {error}
            </p>
          ) : null}
          {!loading ? (
            <Link className="login-card__submit" to="/login">
              Ir a iniciar sesión
            </Link>
          ) : null}
        </AppPanel>
      </div>
    </AdventureScene>
  )
}
