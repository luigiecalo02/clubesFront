import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function HomePage() {
  const auth = useAuth()

  if (auth.loading) {
    return <p className="page-status">Cargando sesión…</p>
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />
  }

  if (auth.requiresContext) {
    return <Navigate to="/contexto" replace />
  }

  const ctx = auth.user.contexto

  return (
    <section className="auth-card">
      <p className="kicker">Clubes</p>
      <h1>Hola, {auth.user.name}</h1>
      <p className="muted">{auth.user.email}</p>
      {ctx ? (
        <p className="muted">
          {ctx.organizacion_nombre}
          {ctx.rol_display_name ? ` · ${ctx.rol_display_name}` : ''}
        </p>
      ) : null}
      <button type="button" className="btn-secondary" onClick={() => void auth.logout()}>
        Cerrar sesión
      </button>
    </section>
  )
}
