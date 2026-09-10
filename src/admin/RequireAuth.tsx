import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.loading) {
    return <p className="page-status admin-boot">Cargando sesión…</p>
  }

  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (auth.requiresContext) {
    return <Navigate to="/contexto" replace />
  }

  return <Outlet />
}
