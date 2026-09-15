import { useEffect, useState, type FormEvent } from 'react'
import { authApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/client'
import { settingsApi } from '../../api/settings'
import type { PublicOrg } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'

type Step = {
  options: PublicOrg[]
  selectedId: number | null
}

type RegisterCardProps = {
  logoUrl?: string | null
  onCancel: () => void
  onRegistered: (email: string) => void
}

function stepLabel(options: PublicOrg[]): string {
  const types = [...new Set(options.map((item) => item.tipo_nombre).filter(Boolean))]
  if (types.length === 1) return types[0]
  if (options.every((item) => item.is_club)) return 'Club'
  return 'Organización'
}

export function RegisterCard({ logoUrl, onCancel, onRegistered }: RegisterCardProps) {
  const [locked, setLocked] = useState<PublicOrg[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [clubId, setClubId] = useState<number | null>(null)
  const [loadingTree, setLoadingTree] = useState(true)
  const [treeError, setTreeError] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nombre1, setNombre1] = useState('')
  const [apellido1, setApellido1] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [tipoIdentificacion, setTipoIdentificacion] = useState<'CC' | 'TI' | 'CE' | 'PA'>('CC')
  const [identificacion, setIdentificacion] = useState('')
  const [telefono, setTelefono] = useState('')

  useEffect(() => {
    let cancelled = false
    settingsApi
      .publicOrgs()
      .then((data) => {
        if (cancelled) return
        setLocked(data.path)
        const root = data.path[data.path.length - 1]
        if (root?.is_club && data.children.length === 0) {
          setSteps([])
          setClubId(root.id)
          return
        }
        setSteps([{ options: data.children, selectedId: null }])
        setClubId(null)
      })
      .catch((err) => {
        if (!cancelled) setTreeError(getApiErrorMessage(err, 'No se pudieron cargar las organizaciones'))
      })
      .finally(() => {
        if (!cancelled) setLoadingTree(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onPick(index: number, rawId: string) {
    const id = Number(rawId)
    const current = steps[index]
    const chosen = current?.options.find((item) => item.id === id)
    if (!chosen) return

    const nextSteps = steps.slice(0, index + 1).map((step, stepIndex) =>
      stepIndex === index ? { ...step, selectedId: id } : step,
    )

    if (chosen.is_club) {
      setSteps(nextSteps)
      setClubId(chosen.id)
      return
    }

    setClubId(null)
    try {
      const data = await settingsApi.publicOrgs(chosen.id)
      setSteps([...nextSteps, { options: data.children, selectedId: null }])
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar las organizaciones hijas'))
      setSteps(nextSteps)
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!clubId) {
      setError('Elige el club al que perteneces.')
      return
    }
    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const nextEmail = correo.trim()
      await settingsApi.register({
        organizacion_id: clubId,
        nombre1: nombre1.trim(),
        apellido1: apellido1.trim(),
        correo: nextEmail,
        password,
        password_confirmation: passwordConfirmation,
        tipo_identificacion: tipoIdentificacion,
        identificacion: identificacion.trim(),
        telefono: telefono.trim() || undefined,
      })
      setRegisteredEmail(nextEmail)
      setOk('Revisa tu correo y confirma la cuenta. Mientras no lo hagas, permanecerá inactiva.')
      onRegistered(nextEmail)
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo crear la cuenta'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onResend() {
    if (!registeredEmail) return
    setError('')
    setOk('')
    setSubmitting(true)
    try {
      await authApi.resendVerification(registeredEmail)
      setOk('Si el correo existe y no está confirmado, enviamos el enlace de nuevo. Revisa también el spam.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo reenviar el correo'))
    } finally {
      setSubmitting(false)
    }
  }

  if (registeredEmail) {
    return (
      <AppPanel className="login-card login-card--register">
        {logoUrl ? <img className="login-card__emblem login-card__emblem--photo" src={logoUrl} alt="" /> : null}
        <p className="login-card__kicker">Confirma tu correo</p>
        <h1>Cuenta inactiva</h1>
        <p className="login-card__subtitle">
          Enviamos un enlace a {registeredEmail}. Confírmalo para activar la cuenta. Si no lo ves, revisa el spam.
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
        <button type="button" className="login-card__submit" disabled={submitting} onClick={() => void onResend()}>
          {submitting ? 'Enviando…' : 'Reenviar correo'}
        </button>
        <div className="login-card__links">
          <button type="button" className="login-card__link" onClick={onCancel}>
            Ir a iniciar sesión
          </button>
        </div>
      </AppPanel>
    )
  }

  return (
    <AppPanel className="login-card login-card--register">
      {logoUrl ? <img className="login-card__emblem login-card__emblem--photo" src={logoUrl} alt="" /> : null}
      <p className="login-card__kicker">Registro</p>
      <h1>Crear cuenta</h1>
      <p className="login-card__subtitle">
        Las organizaciones padre ya están definidas. Elige las hijas hasta tu club.
      </p>

      {treeError || error ? (
        <p className="login-card__alert" role="alert">
          {treeError || error}
        </p>
      ) : null}

      <form className="login-card__form" onSubmit={onSubmit} aria-busy={submitting}>
        {loadingTree ? <p className="app-panel__muted">Cargando organizaciones…</p> : null}

        {locked.length ? (
          <div className="login-card__path" aria-label="Organizaciones padre">
            {locked.map((org) => (
              <p key={org.id} className="login-card__path-item">
                <span>{org.tipo_nombre}</span>
                <strong>{org.nombre}</strong>
              </p>
            ))}
          </div>
        ) : null}

        <div className="login-card__grid">
          {steps.map((step, index) => (
            <label key={`${step.options[0]?.tipo_nombre ?? 'org'}-${index}`}>
              {stepLabel(step.options)}
              <select
                value={step.selectedId ?? ''}
                onChange={(event) => void onPick(index, event.target.value)}
                required
              >
                <option value="">Selecciona…</option>
                {step.options.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {!loadingTree && !clubId && steps.some((step) => step.options.length === 0) ? (
          <p className="app-panel__hint">No hay clubes hijos en esta organización.</p>
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
            <input value={identificacion} onChange={(event) => setIdentificacion(event.target.value)} required />
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
              required
              minLength={8}
            />
          </label>
          <label>
            Confirmar contraseña
            <input
              type="password"
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
              minLength={8}
            />
          </label>
        </div>

        <button type="submit" className="login-card__submit" disabled={submitting || !clubId}>
          {submitting ? 'Creando cuenta…' : 'Registrarme'}
        </button>
      </form>

      <div className="login-card__links">
        <button type="button" className="login-card__link" onClick={onCancel}>
          Ya tengo cuenta
        </button>
      </div>
    </AppPanel>
  )
}
