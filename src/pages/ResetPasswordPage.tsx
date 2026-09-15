import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { AdventureScene } from '../components/login/AdventureScene'
import { AppPanel } from '../theme/AppPanel'
import { SceneThemeToggle } from '../theme/SceneThemeToggle'
import { useSceneTheme } from '../theme/sceneTheme'

export function ResetPasswordPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { theme, toggleTheme } = useSceneTheme()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''
  const orgId = Number.parseInt(params.get('organizacion_id') ?? '', 10)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!token || !email) {
      setError('El enlace no es válido. Solicita uno nuevo desde el inicio de sesión.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const issued = await authApi.resetPassword({
        email,
        token,
        password,
        password_confirmation: confirmation,
        organizacion_id: Number.isInteger(orgId) && orgId > 0 ? orgId : null,
      })
      if (issued?.token) {
        await auth.applySession(issued.token)
        navigate('/', { replace: true })
        return
      }
      navigate('/login', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo restablecer la contraseña'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdventureScene theme={theme} showCopy={false}>
      <SceneThemeToggle theme={theme} onToggle={toggleTheme} />
      <div className="login-scene__content">
        <AppPanel className="login-card" narrow>
          <p className="login-card__kicker">Acceso</p>
          <h1>Nueva contraseña</h1>
          <p className="login-card__subtitle">
            {email ? `Cuenta ${email}` : 'Pega el enlace que te enviamos al correo.'}
          </p>
          {error ? (
            <p className="login-card__alert" role="alert">
              {error}
            </p>
          ) : null}
          <form onSubmit={onSubmit}>
            <label>
              Contraseña nueva
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </label>
            <label>
              Confirmar contraseña
              <input
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                minLength={6}
              />
            </label>
            <button type="submit" className="login-card__submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        </AppPanel>
      </div>
    </AdventureScene>
  )
}
