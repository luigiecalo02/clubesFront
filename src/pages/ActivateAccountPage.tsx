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
  const [tipoIdentificacion, setTipoIdentificacion] = useState<'CC' | 'TI' | 'CE' | 'PA'>('CC')
  const [nombre1, setNombre1] = useState('')
  const [apellido1, setApellido1] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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
      const tipo = (next.persona.tipo_identificacion ?? 'CC').toUpperCase()
      setTipoIdentificacion(tipo === 'TI' || tipo === 'CE' || tipo === 'PA' ? tipo : 'CC')
      setNombre1(next.persona.nombre1 ?? '')
      setApellido1(next.persona.apellido1 ?? '')
      setCorreo(next.persona.correo ?? '')
      setTelefono(next.persona.telefono ?? '')
      setPassword('')
      setConfirmation('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'No encontramos esa identificación en este club'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onActivate(event: FormEvent) {
    event.preventDefault()
    if (!lookup) return
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!lookup.has_user && password.trim().length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (lookup.has_user && password && password.trim().length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const issued = await settingsApi.inviteActivate({
        token,
        identificacion: lookup.persona.identificacion || identificacion.trim(),
        tipo_identificacion: tipoIdentificacion,
        nombre1: nombre1.trim(),
        apellido1: apellido1.trim(),
        correo: correo.trim(),
        telefono: telefono.trim() || undefined,
        ...(password ? { password, password_confirmation: confirmation } : {}),
      })
      await auth.applySession(issued.token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, lookup.has_user ? 'No se pudieron guardar los datos' : 'No se pudo activar la cuenta'))
    } finally {
      setSubmitting(false)
    }
  }

  const orgPath = lookup?.path?.length
    ? lookup.path
    : lookup
      ? [
          {
            id: lookup.organizacion_id,
            nombre: lookup.organizacion_nombre,
            tipo_organizacion_id: 0,
            tipo_nombre: 'Club',
            is_club: true,
          },
        ]
      : []

  return (
    <AdventureScene theme={theme} showCopy={false} backgroundUrl={backgroundUrl} backgroundStyle={backgroundStyle}>
      <SceneThemeToggle theme={theme} onToggle={toggleTheme} />
      <div className="login-scene__content login-scene__content--form">
        <AppPanel className="login-card login-card--register">
          <LoginCardEmblem logoUrl={logoUrl} />
          <p className="login-card__kicker">{lookup ? 'Tus datos' : 'Activar cuenta'}</p>
          <h1>{lookup ? 'Actualizar datos' : preview?.organizacion_nombre || 'Tu club'}</h1>
          <p className="login-card__subtitle">
            {lookup
              ? lookup.has_user
                ? 'Revisa y actualiza tus datos. Si no quieres cambiar la clave, déjala vacía.'
                : 'Revisa tus datos y crea tu contraseña para activar la cuenta.'
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
            <form className="login-card__form" onSubmit={onActivate}>
              {orgPath.length ? (
                <div className="login-card__path" aria-label="Organizaciones">
                  {orgPath.map((org) => (
                    <p key={org.id} className="login-card__path-item">
                      <span>{org.tipo_nombre}</span>
                      <strong>{org.nombre}</strong>
                    </p>
                  ))}
                </div>
              ) : null}

              <div className="login-card__grid">
                <label>
                  Nombre
                  <input value={nombre1} onChange={(event) => setNombre1(event.target.value)} required />
                </label>
                <label>
                  Apellido
                  <input value={apellido1} onChange={(event) => setApellido1(event.target.value)} required />
                </label>
                <label>
                  Tipo de identificación
                  <select
                    value={tipoIdentificacion}
                    onChange={(event) => setTipoIdentificacion(event.target.value as 'CC' | 'TI' | 'CE' | 'PA')}
                  >
                    <option value="CC">Cédula</option>
                    <option value="TI">Tarjeta de identidad</option>
                    <option value="CE">Cédula de extranjería</option>
                    <option value="PA">Pasaporte</option>
                  </select>
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
                    required
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
                    required={!lookup.has_user}
                    minLength={lookup.has_user ? undefined : 8}
                    placeholder={lookup.has_user ? 'Déjala vacía para no cambiarla' : undefined}
                  />
                </label>
                <label>
                  Confirmar contraseña
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    required={!lookup.has_user || Boolean(password)}
                    minLength={lookup.has_user ? undefined : 8}
                  />
                </label>
              </div>
              <button type="submit" className="login-card__submit" disabled={submitting}>
                {submitting
                  ? lookup.has_user
                    ? 'Guardando…'
                    : 'Activando…'
                  : lookup.has_user
                    ? 'Guardar y entrar'
                    : 'Crear mi usuario'}
              </button>
            </form>
          ) : null}

          <div className="login-card__links">
            {lookup ? (
              <button
                type="button"
                className="login-card__link"
                onClick={() => {
                  setLookup(null)
                  setError('')
                  setPassword('')
                  setConfirmation('')
                }}
              >
                Otra identificación
              </button>
            ) : null}
            <Link className="login-card__link" to="/login">
              Ir a iniciar sesión
            </Link>
          </div>
        </AppPanel>
      </div>
    </AdventureScene>
  )
}
