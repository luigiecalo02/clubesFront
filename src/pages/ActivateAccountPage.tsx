import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { settingsApi } from '../api/settings'
import type { ClubesInviteLookup, ClubesInvitePreview } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { AdventureScene } from '../components/login/AdventureScene'
import { LoginCardEmblem } from '../components/login/LoginCardEmblem'
import { usePublicClubBranding } from '../settings/usePublicClubBranding'
import { AppPanel } from '../theme/AppPanel'
import { SceneThemeToggle } from '../theme/SceneThemeToggle'
import { useSceneTheme } from '../theme/sceneTheme'

export function ActivateAccountPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { theme, toggleTheme } = useSceneTheme()
  const token = params.get('token') ?? ''
  const [preview, setPreview] = useState<ClubesInvitePreview | null>(null)
  const [lookup, setLookup] = useState<ClubesInviteLookup | null>(null)
  const [identificacion, setIdentificacion] = useState('')
  const [nombre1, setNombre1] = useState('')
  const [apellido1, setApellido1] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { logoUrl, backgroundUrl } = usePublicClubBranding(preview?.organizacion_id)

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
        if (!cancelled) setError(getApiErrorMessage(err, 'El enlace no es válido o ya expiró'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (auth.user && !auth.loading) {
    return <Navigate to={auth.requiresContext ? '/contexto' : '/'} replace />
  }

  async function onLookup(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const next = await settingsApi.inviteLookup(token, identificacion.trim())
      setLookup(next)
      setNombre1(next.persona.nombre1 ?? '')
      setApellido1(next.persona.apellido1 ?? '')
      setCorreo(next.persona.correo ?? '')
      setTelefono(next.persona.telefono ?? '')
    } catch (err) {
      setError(getApiErrorMessage(err, 'No encontramos esa identificación en este club'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onActivate(event: FormEvent) {
    event.preventDefault()
    if (!lookup) return
    setError('')
    setSubmitting(true)
    try {
      const issued = await settingsApi.inviteActivate({
        token,
        identificacion: lookup.persona.identificacion || identificacion.trim(),
        nombre1: nombre1.trim() || undefined,
        apellido1: apellido1.trim() || undefined,
        correo: correo.trim() || undefined,
        telefono: telefono.trim() || undefined,
        password,
        password_confirmation: confirmation,
      })
      await auth.applySession(issued.token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo activar la cuenta'))
    } finally {
      setSubmitting(false)
    }
  }

  const missing = new Set(lookup?.missing ?? [])

  return (
    <AdventureScene theme={theme} showCopy={false} backgroundUrl={backgroundUrl}>
      <SceneThemeToggle theme={theme} onToggle={toggleTheme} />
      <div className="login-scene__content login-scene__content--form">
        <AppPanel className="login-card login-card--register">
          <LoginCardEmblem logoUrl={logoUrl} />
          <p className="login-card__kicker">Activar cuenta</p>
          <h1>{preview?.organizacion_nombre || 'Tu club'}</h1>
          <p className="login-card__subtitle">
            {lookup
              ? 'Completa solo lo que falte. Quedarás como miembro de esta organización.'
              : 'Escribe tu identificación. El director ya te tiene como persona de este club.'}
          </p>
          {error ? (
            <p className="login-card__alert" role="alert">
              {error}
            </p>
          ) : null}
          {loading ? <p className="app-panel__muted">Revisando el enlace…</p> : null}

          {!loading && !lookup ? (
            <form onSubmit={onLookup}>
              <label>
                Identificación
                <input
                  value={identificacion}
                  onChange={(event) => setIdentificacion(event.target.value)}
                  required
                  autoComplete="off"
                />
              </label>
              <button type="submit" className="login-card__submit" disabled={submitting || !token}>
                {submitting ? 'Buscando…' : 'Continuar'}
              </button>
            </form>
          ) : null}

          {lookup ? (
            <form onSubmit={onActivate}>
              <div className="login-card__grid">
                <label>
                  Nombre
                  <input
                    value={nombre1}
                    onChange={(event) => setNombre1(event.target.value)}
                    required={missing.has('nombre1')}
                    readOnly={!missing.has('nombre1') && Boolean(lookup.persona.nombre1)}
                  />
                </label>
                <label>
                  Apellido
                  <input
                    value={apellido1}
                    onChange={(event) => setApellido1(event.target.value)}
                    required={missing.has('apellido1')}
                    readOnly={!missing.has('apellido1') && Boolean(lookup.persona.apellido1)}
                  />
                </label>
                <label>
                  Identificación
                  <input value={lookup.persona.identificacion ?? identificacion} readOnly />
                </label>
                <label>
                  Correo electrónico
                  <input
                    type="email"
                    autoComplete="email"
                    value={correo}
                    onChange={(event) => setCorreo(event.target.value)}
                    required={missing.has('correo')}
                  />
                </label>
                <label>
                  Teléfono
                  <input value={telefono} onChange={(event) => setTelefono(event.target.value)} />
                </label>
                <label>
                  Contraseña
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
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
                    minLength={8}
                  />
                </label>
              </div>
              <button type="submit" className="login-card__submit" disabled={submitting}>
                {submitting ? 'Activando…' : 'Crear mi usuario'}
              </button>
            </form>
          ) : null}

          <div className="login-card__links">
            <Link className="login-card__link" to="/login">
              Ir a iniciar sesión
            </Link>
          </div>
        </AppPanel>
      </div>
    </AdventureScene>
  )
}
