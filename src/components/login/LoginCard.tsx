import { useState, type FormEvent } from 'react'
import { usePwaInstall } from '../../pwa/usePwaInstall'

type LoginCardProps = {
  email: string
  password: string
  error: string
  hint: string
  submitting: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onGoogle: () => void
  onForgotPassword: () => void
  onCreateAccount: () => void
}

function Emblem() {
  return (
    <svg className="login-card__emblem" viewBox="0 0 88 88" aria-hidden="true">
      <circle cx="44" cy="44" r="42" fill="#111827" stroke="#f0c14b" strokeWidth="2.2" />
      <circle cx="44" cy="44" r="36" fill="none" stroke="#c8102e" strokeWidth="1.4" />
      <polygon points="44,16 70,68 18,68" fill="#fffaf0" />
      <polygon
        points="44,22 64,64 24,64"
        fill="none"
        stroke="#c8102e"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <rect x="42" y="26" width="4" height="36" rx="1" fill="#1d4ed8" />
      <polygon points="44,20 48,30 40,30" fill="#c8102e" />
      <polygon points="36,40 44,34 52,40 48,42 44,38 40,42" fill="#f0c14b" />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="login-card__google-icon" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4A7.2 7.2 0 0 1 5 12c0-.8.1-1.6.4-2.4V6.5H1.4A12 12 0 0 0 0 12c0 1.9.5 3.8 1.4 5.5l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5C17.9 1.1 15.2 0 12 0A12 12 0 0 0 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z"
      />
    </svg>
  )
}

export function LoginCard({
  email,
  password,
  error,
  hint,
  submitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogle,
  onForgotPassword,
  onCreateAccount,
}: LoginCardProps) {
  const [showPassword, setShowPassword] = useState(false)
  const pwa = usePwaInstall()

  return (
    <section className="login-card">
      <div className="login-card__shine" aria-hidden="true" />
      <Emblem />
      <p className="login-card__kicker">Club de Conquistadores</p>
      <h1>CONQUISTADORES</h1>
      <p className="login-card__subtitle">Conectados con la misión</p>

      {error ? (
        <p className="login-card__alert" role="alert">
          {error}
        </p>
      ) : null}
      {hint && !error ? (
        <p className="login-card__hint" role="status">
          {hint}
        </p>
      ) : null}

      <form onSubmit={onSubmit} aria-busy={submitting}>
        <label>
          Correo electrónico
          <span className="login-card__field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2v.3l8 5 8-5V8H4zm16 8V10.7l-7.4 4.6a1 1 0 0 1-1.2 0L4 10.7V16h16z"
              />
            </svg>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              required
              placeholder="tu@correo.com"
            />
          </span>
        </label>

        <label>
          Contraseña
          <span className="login-card__field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2a5 5 0 0 1 5 5v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v3h6V7a3 3 0 0 0-3-3z"
              />
            </svg>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
              placeholder="••••••••"
            />
            <button
              type="button"
              className="login-card__reveal"
              onClick={() => setShowPassword((open) => !open)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? 'Ocultar' : 'Ver'}
            </button>
          </span>
        </label>

        <button type="submit" className="login-card__submit" disabled={submitting}>
          {submitting ? (
            <>
              <span className="login-card__spinner" aria-hidden="true" />
              Ingresando…
            </>
          ) : (
            <>
              INGRESAR
              <span className="login-card__arrow" aria-hidden="true">
                →
              </span>
            </>
          )}
        </button>
      </form>

      <div className="login-card__divider">
        <span>o continúa con</span>
      </div>

      <button type="button" className="login-card__google" onClick={onGoogle}>
        <GoogleMark />
        Continuar con Google
      </button>

      <div className="login-card__links">
        <button type="button" className="login-card__link" onClick={onForgotPassword}>
          ¿Olvidaste tu contraseña?
        </button>
        <button type="button" className="login-card__link login-card__link--accent" onClick={onCreateAccount}>
          Crear una cuenta
        </button>
      </div>
      {pwa.canInstall ? (
        <button type="button" className="login-card__link login-card__install" onClick={() => void pwa.install()}>
          Instalar aplicación
        </button>
      ) : null}
    </section>
  )
}
