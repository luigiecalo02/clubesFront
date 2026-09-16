import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import { AdventureScene } from '../components/login/AdventureScene'
import { LoginCardEmblem } from '../components/login/LoginCardEmblem'
import { usePublicClubBranding } from '../settings/usePublicClubBranding'
import { AppPanel } from '../theme/AppPanel'
import { SceneThemeToggle } from '../theme/SceneThemeToggle'
import { useSceneTheme } from '../theme/sceneTheme'

export function ConfirmAccountPage() {
  const [params] = useSearchParams()
  const { theme, toggleTheme } = useSceneTheme()
  const id = Number.parseInt(params.get('id') ?? '', 10)
  const hash = params.get('hash') ?? ''
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(true)
  const { logoUrl, backgroundUrl } = usePublicClubBranding()

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0 || !hash) {
      setLoading(false)
      setError('El enlace de confirmación no es válido.')
      return
    }

    let cancelled = false
    authApi
      .verifyEmail(id, hash)
      .then(() => {
        if (!cancelled) setOk('Correo confirmado. Ya puedes iniciar sesión.')
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudo confirmar el correo'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [hash, id])

  return (
    <AdventureScene theme={theme} showCopy={false} backgroundUrl={backgroundUrl}>
      <SceneThemeToggle theme={theme} onToggle={toggleTheme} />
      <div className="login-scene__content">
        <AppPanel className="login-card" narrow>
          <LoginCardEmblem logoUrl={logoUrl} />
          <p className="login-card__kicker">Cuenta</p>
          <h1>Confirmar correo</h1>
          <p className="login-card__subtitle">
            {loading
              ? 'Estamos activando tu cuenta…'
              : ok
                ? 'Tu usuario ya está activo.'
                : 'Si el enlace expiró, vuelve al registro o pide que te reenvíen el correo.'}
          </p>
          {error ? (
            <p className="login-card__alert" role="alert">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className="login-card__hint" role="status">
              {ok}
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
