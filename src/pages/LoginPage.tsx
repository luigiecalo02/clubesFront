import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { AnimatedSky } from '../components/login/AnimatedSky'
import { Campfire } from '../components/login/Campfire'
import { Explorer } from '../components/login/Explorer'
import { Flags } from '../components/login/Flags'
import { Fog } from '../components/login/Fog'
import { Forest } from '../components/login/Forest'
import { LoginCard } from '../components/login/LoginCard'
import { Moon } from '../components/login/Moon'
import { Mountains } from '../components/login/Mountains'
import { Particles } from '../components/login/Particles'
import { Stars } from '../components/login/Stars'
import '../components/login/login-scene.css'

const UNAVAILABLE_HINT =
  'Esta opción se habilitará pronto. Por ahora ingresa con tu correo de ProjectJA.'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const sceneRef = useRef<HTMLDivElement>(null)
  const redirectTo =
    typeof (location.state as { from?: string } | null)?.from === 'string'
      ? (location.state as { from: string }).from
      : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const root = sceneRef.current
    if (!root) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce), (hover: none)')
    if (reduced.matches) return

    let frame = 0
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2
        const y = (event.clientY / window.innerHeight - 0.5) * 2
        root.style.setProperty('--px', x.toFixed(3))
        root.style.setProperty('--py', y.toFixed(3))
      })
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [auth.loading, auth.user])

  if (auth.loading) {
    return (
      <div className="login-scene login-scene--booting">
        <AnimatedSky />
        <p className="login-scene__status">Cargando sesión…</p>
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
    <div className="login-scene" ref={sceneRef}>
      <AnimatedSky />
      <Stars />
      <Moon />
      <Mountains />
      <Forest />
      <Fog />
      <Flags />
      <div className="login-scene__ground" aria-hidden="true" />
      <Explorer />
      <Campfire />
      <Particles />

      <div className="login-scene__copy">
        <p>Disciplina · Servicio · Amor</p>
        <h2>Una misión, un propósito</h2>
      </div>

      <div className="login-scene__content">
        <LoginCard
          email={email}
          password={password}
          error={error}
          hint={hint}
          submitting={submitting}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={onSubmit}
          onGoogle={() => {
            setError('')
            setHint(UNAVAILABLE_HINT)
          }}
          onForgotPassword={() => {
            setError('')
            setHint(UNAVAILABLE_HINT)
          }}
          onCreateAccount={() => {
            setError('')
            setHint(UNAVAILABLE_HINT)
          }}
        />
      </div>
    </div>
  )
}
