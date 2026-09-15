import { useState, type FormEvent } from 'react'
import { authApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/client'
import { AppPanel } from '../../theme/AppPanel'

type ForgotPasswordCardProps = {
  logoUrl?: string | null
  initialEmail?: string
  onCancel: () => void
}

export function ForgotPasswordCard({ logoUrl, initialEmail = '', onCancel }: ForgotPasswordCardProps) {
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setOk('')
    setSubmitting(true)
    try {
      const result = await authApi.forgotPassword(email.trim())
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
    <AppPanel className="login-card login-card--register">
      {logoUrl ? <img className="login-card__emblem login-card__emblem--photo" src={logoUrl} alt="" /> : null}
      <p className="login-card__kicker">Recuperar acceso</p>
      <h1>Olvidé mi contraseña</h1>
      <p className="login-card__subtitle">
        Escribe tu correo. Usaremos la organización a la que ya perteneces, sin que tengas que elegirla.
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

        <button type="submit" className="login-card__submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>

      <div className="login-card__links">
        <button type="button" className="login-card__link" onClick={onCancel}>
          Volver al ingreso
        </button>
      </div>
    </AppPanel>
  )
}
