import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function RequirePermission({
  permission,
  children,
}: {
  permission: string
  children: ReactNode
}) {
  const auth = useAuth()

  if (!auth.can(permission)) {
    return <Navigate to="/" replace />
  }

  return children
}
