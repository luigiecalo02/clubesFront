import type { ReactNode } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
import type { ClubPerson } from '../../api/types'
import { memberInitials } from '../attendance/AttendanceMarkList'
import type { MemberInsightKind } from './MemberInsightDrawer'

type MemberActionsProps = {
  persona: ClubPerson
  canUpdate: boolean
  canImpersonate: boolean
  canViewSaldos?: boolean
  canViewAttendance?: boolean
  currentUserId?: number | null
  onEdit: (persona: ClubPerson) => void
  onPassword: (persona: ClubPerson) => void
  onImpersonate: (persona: ClubPerson) => void
  onInsight?: (persona: ClubPerson, kind: MemberInsightKind) => void
}

export function memberUserId(persona: ClubPerson): number | null {
  return persona.user_id ?? null
}

function ActionIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MemberNameCell({ persona }: { persona: ClubPerson }) {
  const photo = resolveFileUrl(persona.foto_url)
  return (
    <td>
      <span className="admin-club__who">
        <span className="admin-club__who-photo" aria-hidden="true">
          {photo ? <img src={photo} alt="" /> : memberInitials(persona.full_name)}
        </span>
        {persona.full_name}
      </span>
    </td>
  )
}

export function MemberActions({
  persona,
  canUpdate,
  canImpersonate,
  canViewSaldos = false,
  canViewAttendance = false,
  currentUserId,
  onEdit,
  onPassword,
  onImpersonate,
  onInsight,
}: MemberActionsProps) {
  const userId = memberUserId(persona)
  const hasUser = userId !== null
  const canLoginAs = canImpersonate && hasUser && userId !== currentUserId
  const canSeeSaldos = Boolean(canViewSaldos && onInsight)
  const canSeeAttendance = Boolean(canViewAttendance && onInsight)

  if (!canUpdate && !canLoginAs && !canSeeSaldos && !canSeeAttendance) return null

  return (
    <div className="admin-club__actions">
      {canSeeSaldos ? (
        <button
          type="button"
          className="admin-club__action"
          title="Ver saldos"
          aria-label={`Ver saldos de ${persona.full_name}`}
          onClick={() => onInsight?.(persona, 'saldos')}
        >
          <ActionIcon d="M4 8h16v11H4zM4 8V6.5A1.5 1.5 0 0 1 5.5 5H16M16 13.5h3" />
        </button>
      ) : null}
      {canSeeAttendance ? (
        <button
          type="button"
          className="admin-club__action"
          title="Ver asistencias"
          aria-label={`Ver asistencias de ${persona.full_name}`}
          onClick={() => onInsight?.(persona, 'asistencias')}
        >
          <ActionIcon d="M7 4v2m10-2v2M5 8h14M6 6h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
        </button>
      ) : null}
      {canUpdate ? (
        <button
          type="button"
          className="admin-club__action"
          title="Editar"
          aria-label={`Editar a ${persona.full_name}`}
          onClick={() => onEdit(persona)}
        >
          <ActionIcon d="M4 20h4l11-11-4-4L4 16v4zM14 6l4 4" />
        </button>
      ) : null}
      {canUpdate && hasUser ? (
        <button
          type="button"
          className="admin-club__action"
          title="Cambiar contraseña"
          aria-label={`Cambiar contraseña de ${persona.full_name}`}
          onClick={() => onPassword(persona)}
        >
          <ActionIcon d="M7 14a4 4 0 1 1 3.2-6.4L17 10.4V14h-2v2h-2.4L10.4 17.2A4 4 0 0 1 7 14zm-1.2-4h.01" />
        </button>
      ) : null}
      {canLoginAs ? (
        <button
          type="button"
          className="admin-club__action admin-club__action--accent"
          title="Entrar como este usuario"
          aria-label={`Entrar como ${persona.full_name}`}
          onClick={() => onImpersonate(persona)}
        >
          <ActionIcon d="M10 17H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4M14 16l4-4-4-4M10 12h8" />
        </button>
      ) : null}
    </div>
  )
}

type MemberRowProps = MemberActionsProps & {
  children: ReactNode
}

export function MemberRow({ children, ...actions }: MemberRowProps) {
  return (
    <tr>
      {children}
      <td className="admin-club__actions-cell">
        <MemberActions {...actions} />
      </td>
    </tr>
  )
}
