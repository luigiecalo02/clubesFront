import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import {
  canAccessClubAbonos,
  canAccessClubAttendance,
  canAccessClubPresupuesto,
  canAccessClubSettings,
} from './menu'
import { useAuth } from '../auth/AuthProvider'
import { useClubesSettings } from '../settings/ClubesSettingsProvider'

export function RequirePermission({
  permission,
  requireOrgSettings = false,
  requireAttendance = false,
  requireAbonos = false,
  requirePresupuesto = false,
  children,
}: {
  permission: string
  requireOrgSettings?: boolean
  requireAttendance?: boolean
  requireAbonos?: boolean
  requirePresupuesto?: boolean
  children: ReactNode
}) {
  const auth = useAuth()
  const { loading } = useClubesSettings()
  const ctx = auth.user?.contexto

  if (requireOrgSettings) {
    if (loading) return null
    if (
      !canAccessClubSettings({
        rolName: ctx?.rol_name,
        organizacionId: ctx?.organizacion_id,
      })
    ) {
      return <Navigate to="/" replace />
    }
    return children
  }

  if (requireAttendance) {
    if (
      canAccessClubAttendance({
        rolName: ctx?.rol_name,
        organizacionId: ctx?.organizacion_id,
      }) ||
      auth.can(permission)
    ) {
      return children
    }
    return <Navigate to="/" replace />
  }

  if (requireAbonos) {
    if (
      canAccessClubAbonos({
        rolName: ctx?.rol_name,
        organizacionId: ctx?.organizacion_id,
      }) ||
      auth.can(permission)
    ) {
      return children
    }
    return <Navigate to="/" replace />
  }

  if (requirePresupuesto) {
    if (
      canAccessClubPresupuesto({
        rolName: ctx?.rol_name,
        organizacionId: ctx?.organizacion_id,
      }) ||
      auth.can(permission)
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
