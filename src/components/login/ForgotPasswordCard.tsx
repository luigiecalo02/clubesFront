import { useState, type FormEvent } from 'react'
import { authApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/client'
import { AppPanel } from '../../theme/AppPanel'
import { LoginCardEmblem } from './LoginCardEmblem'

type ForgotPasswordCardProps = {
  logoUrl?: string | null
  initialEmail?: string
  organizacionId?: number | null
  onCancel: () => void
}

type LookupMode = 'email' | 'identificacion'

export function ForgotPasswordCard({
  logoUrl,
  initialEmail = '',
  organizacionId = null,
  onCancel,
}: ForgotPasswordCardProps) {
  const [mode, setMode] = useState<LookupMode>('email')
  const [email, setEmail] = useState(initialEmail)
  const [identificacion, setIdentificacion] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function switchMode(next: LookupMode) {
    setMode(next)
    setError('')
    setOk('')
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setOk('')
    setSubmitting(true)
    try {
      const result = await authApi.forgotPassword({
        ...(mode === 'email'
          ? { email: email.trim() }
          : { identificacion: identificacion.trim().replace(/[^A-Za-z0-9.\-]/g, '') }),
        organizacionId,
      })
      setOk(
        result.email_masked
          ? `Enviamos el enlace a ${result.email_masked}. Revisa también el spam.`
          : 'Si la cuenta existe, enviamos el enlace de recuperación. Revisa también el spam.',
      )
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo enviar el correo de recuperación'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppPanel className="login-card" narrow>
      <LoginCardEmblem logoUrl={logoUrl} />
      <p className="login-card__kicker">Recuperar acceso</p>
      <h1>Olvidé mi contraseña</h1>
      <p className="login-card__subtitle">
        {mode === 'email'
          ? 'Escribe tu correo. Usaremos la organización a la que ya perteneces, sin que tengas que elegirla.'
          : 'Si no recuerdas el correo, escribe tu número de identificación. Enviaremos el enlace al correo de tu ficha.'}
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

      <form className="login-card__form" onSubmit={onSubmit}>
        {mode === 'email' ? (
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
        ) : (
          <label>
            Número de identificación
            <input
              type="text"
              autoComplete="off"
              value={identificacion}
              onChange={(event) => setIdentificacion(event.target.value)}
              required
              minLength={5}
            />
          </label>
        )}

        <button type="submit" className="login-card__submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>

      <div className="login-card__links">
        {mode === 'email' ? (
          <button type="button" className="login-card__link" onClick={() => switchMode('identificacion')}>
            No tengo el correo
          </button>
        ) : (
          <button type="button" className="login-card__link" onClick={() => switchMode('email')}>
            Recuperar con correo
          </button>
        )}
        <button type="button" className="login-card__link" onClick={onCancel}>
          Volver al ingreso
        </button>
      </div>
    </AppPanel>
  )
}
