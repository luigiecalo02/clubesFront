import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { resolveClubRootId, resolveFileUrl } from '../api/baseUrl'
import { getApiErrorMessage } from '../api/client'
import { settingsApi } from '../api/settings'
import { DEFAULT_LOGIN_BRANDING, type ClubesPublicBranding } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { AdventureScene } from '../components/login/AdventureScene'
import { AnimatedSky } from '../components/login/AnimatedSky'
import { ForgotPasswordCard } from '../components/login/ForgotPasswordCard'
import { LoginCard } from '../components/login/LoginCard'
import { RegisterCard } from '../components/login/RegisterCard'
import { SceneThemeToggle } from '../theme/SceneThemeToggle'
import { useSceneTheme } from '../theme/sceneTheme'

const UNAVAILABLE_HINT =
  'Esta opción se habilitará pronto. Por ahora ingresa con tu correo de ProjectJA.'

function parseOrgId(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 && String(parsed) === value ? parsed : null
}

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { orgId: orgIdParam } = useParams()
  const orgId = parseOrgId(orgIdParam) ?? resolveClubRootId()
  const { theme, toggleTheme } = useSceneTheme()
  const [branding, setBranding] = useState<ClubesPublicBranding>(DEFAULT_LOGIN_BRANDING)
  const redirectTo =
    typeof (location.state as { from?: string } | null)?.from === 'string'
      ? (location.state as { from: string }).from
      : '/'

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    settingsApi
      .publicBranding(orgId)
      .then((next) => {
        if (!cancelled) setBranding(next)
      })
      .catch(() => {
        if (!cancelled) setBranding(DEFAULT_LOGIN_BRANDING)
      })
    return () => {
      cancelled = true
    }
  }, [orgId])

  if (auth.loading) {
    return (
      <div className={`login-scene login-scene--booting${theme === 'day' ? ' login-scene--day' : ''}`}>
        <AnimatedSky />
        <div className="login-scene__boot">
          <img className="login-scene__boot-logo" src="/ric-logo.png" alt="RIC" />
          <p className="login-scene__status">Cargando sesión…</p>
        </div>
      </div>
    )
  }

  if (auth.user) {
    return <Navigate to={auth.requiresContext ? '/contexto' : redirectTo} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setHint('')
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
    <AdventureScene
      theme={theme}
      showCopy
      copy={{ values: branding.clubes.values, motto: branding.clubes.motto }}
      backgroundUrl={resolveFileUrl(branding.background_url || branding.clubes.background_url)}
    >
      <SceneThemeToggle theme={theme} onToggle={toggleTheme} />
      <div
        className={`login-scene__content${mode === 'register' ? ' login-scene__content--form' : ''}`}
      >
        {mode === 'forgot' ? (
          <ForgotPasswordCard
            logoUrl={resolveFileUrl(branding.clubes.logo_url || branding.logo_url)}
            initialEmail={email}
            onCancel={() => {
              setMode('login')
              setError('')
              setHint('')
            }}
          />
        ) : mode === 'register' ? (
          <RegisterCard
            logoUrl={resolveFileUrl(branding.clubes.logo_url || branding.logo_url)}
            onCancel={() => {
              setMode('login')
              setError('')
              setHint('')
            }}
            onRegistered={(nextEmail) => {
              setEmail(nextEmail)
              setPassword('')
              setHint('Confirma tu correo para activar la cuenta. Hasta entonces permanecerá inactiva.')
            }}
          />
        ) : (
          <LoginCard
            email={email}
            password={password}
            error={error}
            hint={hint}
            submitting={submitting}
            kicker={branding.clubes.kicker}
            title={branding.clubes.title}
            subtitle={branding.clubes.subtitle}
            organizationName={branding.organizacion_nombre}
            logoUrl={resolveFileUrl(branding.clubes.logo_url || branding.logo_url)}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={onSubmit}
            onGoogle={() => {
              setError('')
              setHint(UNAVAILABLE_HINT)
            }}
            onForgotPassword={() => {
              setError('')
              setHint('')
              setMode('forgot')
            }}
            onCreateAccount={() => {
              setError('')
              setHint('')
              setMode('register')
            }}
          />
        )}
      </div>
    </AdventureScene>
  )
}
