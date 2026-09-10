import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthProvider'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo =
    typeof (location.state as { from?: string } | null)?.from === 'string'
      ? (location.state as { from: string }).from
      : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (auth.loading) {
    return <p className="page-status">Cargando sesión…</p>
  }

  if (auth.user) {
    return <Navigate to={auth.requiresContext ? '/contexto' : redirectTo} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await auth.login(email.trim(), password)
      const needsContext = Boolean(user.requires_context && !user.contexto)
      navigate(needsContext ? '/contexto' : redirectTo, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Correo o contraseña incorrectos'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-card">
      <p className="kicker">Clubes</p>
      <h1>Iniciar sesión</h1>
      <p className="muted">Usa tu cuenta de ProjectJA para entrar.</p>

      {error ? <p className="alert">{error}</p> : null}

      <form onSubmit={onSubmit}>
        <label>
          Correo
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </section>
  )
}
