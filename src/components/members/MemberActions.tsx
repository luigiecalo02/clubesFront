import type { ReactNode } from 'react'
import type { ClubPerson } from '../../api/types'

type MemberActionsProps = {
  persona: ClubPerson
  canUpdate: boolean
  canImpersonate: boolean
  currentUserId?: number | null
  onEdit: (persona: ClubPerson) => void
  onPassword: (persona: ClubPerson) => void
  onImpersonate: (persona: ClubPerson) => void
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

export function MemberActions({
  persona,
  canUpdate,
  canImpersonate,
  currentUserId,
  onEdit,
  onPassword,
  onImpersonate,
}: MemberActionsProps) {
  const userId = memberUserId(persona)
  const hasUser = userId !== null
  const canLoginAs = canImpersonate && hasUser && userId !== currentUserId

  if (!canUpdate && !canLoginAs) return null

  return (
    <div className="admin-club__actions">
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
