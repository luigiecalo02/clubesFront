import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import {
  canAccessClubAttendance,
  canAccessClubFinanzas,
  canAccessClubPresupuesto,
  canAccessClubSettings,
  canManageClubServices,
  clubAccessFromUser,
} from './menu'
import { useAuth } from '../auth/AuthProvider'
import { useClubesSettings } from '../settings/ClubesSettingsProvider'

export function RequirePermission({
  permission,
  requireOrgSettings = false,
  requireAttendance = false,
  requirePresupuesto = false,
  requireFinanzas = false,
  requireServices = false,
  children,
}: {
  permission: string
  requireOrgSettings?: boolean
  requireAttendance?: boolean
  requirePresupuesto?: boolean
  requireFinanzas?: boolean
  requireServices?: boolean
  children: ReactNode
}) {
  const auth = useAuth()
  const { loading } = useClubesSettings()
  const access = clubAccessFromUser(auth.user, auth.can)

  if (requireOrgSettings) {
    if (loading) return null
    if (!canAccessClubSettings(access)) {
      return <Navigate to="/" replace />
    }
    return children
  }

  if (requireAttendance) {
    if (canAccessClubAttendance(access) || auth.can(permission)) {
      return children
    }
    return <Navigate to="/" replace />
  }

  if (requireServices) {
    if (canManageClubServices(access)) {
      return children
    }
    return <Navigate to="/" replace />
  }

  if (requirePresupuesto) {
    if (canAccessClubPresupuesto(access) || auth.can(permission)) {
      return children
    }
    return <Navigate to="/" replace />
  }

  if (requireFinanzas) {
    if (
      canAccessClubFinanzas(access) ||
      auth.can(permission) ||
      auth.can('abonos.view')
    ) {
      return children
    }
    return <Navigate to="/" replace />
  }

  if (!auth.can(permission)) {
    return <Navigate to="/" replace />
  }

  return children
}
