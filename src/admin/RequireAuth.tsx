import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.loading) {
    return (
      <div className="admin-boot">
        <img className="admin-boot__logo" src="/ric-logo.png" alt="RIC" />
        <p className="page-status">Cargando sesión…</p>
      </div>
    )
  }

  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (auth.requiresContext) {
    return <Navigate to="/contexto" replace />
  }

  return <Outlet />
}
