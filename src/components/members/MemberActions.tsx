import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { resolveFileUrl } from '../../api/baseUrl'
import type { ClubPerson } from '../../api/types'
import { memberInitials } from '../attendance/AttendanceMarkList'
import type { MemberInsightKind } from './MemberInsightDrawer'

type MenuAnchor = {
  top?: number
  bottom?: number
  right: number
  maxHeight: number
}

function readMenuAnchor(trigger: HTMLElement | null): MenuAnchor | null {
  if (!trigger) return null
  const rect = trigger.getBoundingClientRect()
  const gutter = 12
  const spaceBelow = window.innerHeight - rect.bottom - gutter
  const spaceAbove = rect.top - gutter
  const openUp = spaceBelow < 220 && spaceAbove > spaceBelow
  const maxHeight = Math.max(160, openUp ? spaceAbove : spaceBelow)
  return {
    ...(openUp
      ? { bottom: Math.max(gutter, window.innerHeight - rect.top + 8) }
      : { top: rect.bottom + 8 }),
    right: Math.max(gutter, window.innerWidth - rect.right),
    maxHeight,
  }
}

type MemberActionsProps = {
  persona: ClubPerson
  canUpdate: boolean
  canImpersonate: boolean
  canViewSaldos?: boolean
  canViewAttendance?: boolean
  currentUserId?: number | null
  organizacionId?: number | null
  onEdit: (persona: ClubPerson) => void
  onPassword: (persona: ClubPerson) => void
  onImpersonate: (persona: ClubPerson) => void
  onToggleAccess?: (persona: ClubPerson) => void
  onToggleMembership?: (persona: ClubPerson) => void
  onInsight?: (persona: ClubPerson, kind: MemberInsightKind) => void
}

export function memberUserId(persona: ClubPerson): number | null {
  return persona.user_id ?? null
}

export function memberHasUser(persona: ClubPerson | null | undefined): boolean {
  return Boolean(persona && memberUserId(persona) !== null)
}

export function memberUserActive(persona: ClubPerson): boolean {
  return Boolean(persona.user_id) && persona.user_is_active !== false
}

export function memberClubActive(persona: ClubPerson, organizacionId?: number | null): boolean {
  if (!organizacionId) {
    const rows = persona.organizaciones ?? []
    if (!rows.length) return true
    return rows.some((row) => row.estado !== false)
  }
  const row = persona.organizaciones?.find((item) => Number(item.organizacion_id) === Number(organizacionId))
  if (!row) return true
  return row.estado !== false
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

export function MemberNameCell({
  persona,
  organizacionId,
}: {
  persona: ClubPerson
  organizacionId?: number | null
}) {
  const photo = resolveFileUrl(persona.foto_url)
  const hasUser = memberHasUser(persona)
  const userActive = memberUserActive(persona)
  const clubActive = memberClubActive(persona, organizacionId)
  return (
    <td>
      <span className="admin-club__who">
        <span className="admin-club__who-photo" aria-hidden="true">
          {photo ? <img src={photo} alt="" /> : memberInitials(persona.full_name)}
        </span>
        <span className="admin-club__who-copy">
          <strong>{persona.full_name}</strong>
          <small className={clubActive ? 'is-ok' : 'is-off'}>
            {clubActive ? 'Integrante activo' : 'Integrante no activo'}
            {' · '}
            {!hasUser ? 'Sin usuario' : userActive ? 'Usuario activo' : 'Usuario inactivo'}
          </small>
        </span>
      </span>
    </td>
  )
}

type ActionItem = {
  key: string
  label: string
  title: string
  accent?: boolean
  danger?: boolean
  icon: string
  onClick: () => void
}

export function MemberActions({
  persona,
  canUpdate,
  canImpersonate,
  canViewSaldos = false,
  canViewAttendance = false,
  currentUserId,
  organizacionId,
  onEdit,
  onPassword,
  onImpersonate,
  onToggleAccess,
  onToggleMembership,
  onInsight,
}: MemberActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const userId = memberUserId(persona)
  const hasUser = userId !== null
  const userActive = memberUserActive(persona)
  const clubActive = memberClubActive(persona, organizacionId)
  const canLoginAs = canImpersonate && hasUser && userActive && clubActive && userId !== currentUserId
  const canSeeSaldos = Boolean(canViewSaldos && onInsight)
  const canSeeAttendance = Boolean(canViewAttendance && onInsight)
  const canManageAccess = Boolean(canUpdate && onToggleAccess)
  const canManageMembership = Boolean(canUpdate && onToggleMembership)

  useLayoutEffect(() => {
    if (!menuOpen) return undefined
    function place() {
      setAnchor(readMenuAnchor(menuTriggerRef.current))
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return undefined
    function onPointer(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if ((target as Element).closest?.('.admin-club__actions-panel')) return
      setMenuOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const items: ActionItem[] = []
  if (canSeeSaldos) {
    items.push({
      key: 'saldos',
      label: 'Ver saldos',
      title: `Ver saldos de ${persona.full_name}`,
      icon: 'M4 8h16v11H4zM4 8V6.5A1.5 1.5 0 0 1 5.5 5H16M16 13.5h3',
      onClick: () => onInsight?.(persona, 'saldos'),
    })
  }
  if (canSeeAttendance) {
    items.push({
      key: 'asistencias',
      label: 'Ver asistencias',
      title: `Ver asistencias de ${persona.full_name}`,
      icon: 'M7 4v2m10-2v2M5 8h14M6 6h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
      onClick: () => onInsight?.(persona, 'asistencias'),
    })
  }
  if (canUpdate) {
    items.push({
      key: 'edit',
      label: 'Editar',
      title: `Editar a ${persona.full_name}`,
      icon: 'M4 20h4l11-11-4-4L4 16v4zM14 6l4 4',
      onClick: () => onEdit(persona),
    })
  }
  if (canManageMembership) {
    items.push({
      key: 'membership',
      label: clubActive ? 'Marcar no activo' : 'Marcar activo',
      title: clubActive
        ? `Sacar a ${persona.full_name} de las listas del club`
        : `Volver a incluir a ${persona.full_name} en las listas del club`,
      accent: !clubActive,
      danger: clubActive,
      icon: clubActive
        ? 'M18.4 5.6 5.6 18.4M9 12a3 3 0 0 0 3 3'
        : 'M9 11l3 3 8-8M5 19V5a1 1 0 0 1 1-1h8',
      onClick: () => onToggleMembership?.(persona),
    })
  }
  if (canManageAccess) {
    items.push({
      key: 'access',
      label: !hasUser ? 'Activar usuario' : userActive ? 'Desactivar usuario' : 'Activar usuario',
      title: !hasUser
        ? `Crear y activar acceso de ${persona.full_name}`
        : userActive
          ? `Desactivar acceso de ${persona.full_name}`
          : `Activar acceso de ${persona.full_name}`,
      accent: !userActive,
      danger: hasUser && userActive,
      icon: !hasUser || !userActive
        ? 'M12 3v3M12 18v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M3 12h3M18 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0z'
        : 'M18.4 5.6 5.6 18.4M9 12a3 3 0 0 0 3 3',
      onClick: () => onToggleAccess?.(persona),
    })
  }
  if (canUpdate && hasUser) {
    items.push({
      key: 'password',
      label: 'Cambiar contraseña',
      title: `Cambiar contraseña de ${persona.full_name}`,
      icon: 'M7 14a4 4 0 1 1 3.2-6.4L17 10.4V14h-2v2h-2.4L10.4 17.2A4 4 0 0 1 7 14zm-1.2-4h.01',
      onClick: () => onPassword(persona),
    })
  }
  if (canLoginAs) {
    items.push({
      key: 'impersonate',
      label: 'Entrar como este usuario',
      title: `Entrar como ${persona.full_name}`,
      accent: true,
      icon: 'M10 17H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4M14 16l4-4-4-4M10 12h8',
      onClick: () => onImpersonate(persona),
    })
  }

  if (items.length === 0) return null

  function run(item: ActionItem) {
    setMenuOpen(false)
    item.onClick()
  }

  return (
    <div className="admin-club__actions" ref={rootRef}>
      <div className="admin-club__actions-inline">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`admin-club__action${item.accent ? ' admin-club__action--accent' : ''}${item.danger ? ' admin-club__action--danger' : ''}`}
            title={item.title}
            aria-label={item.title}
            onClick={() => run(item)}
          >
            <ActionIcon d={item.icon} />
          </button>
        ))}
      </div>

      <div className="admin-club__actions-menu">
        <button
          ref={menuTriggerRef}
          type="button"
          className={`admin-club__action${menuOpen ? ' is-on' : ''}`}
          aria-label={`Acciones de ${persona.full_name}`}
          aria-expanded={menuOpen}
          onClick={() => {
            const next = !menuOpen
            setMenuOpen(next)
            if (next) setAnchor(readMenuAnchor(menuTriggerRef.current))
          }}
        >
          <ActionIcon d="M12 6.5h.01M12 12h.01M12 17.5h.01" />
        </button>
        {menuOpen && anchor
          ? createPortal(
              <div
                className="admin-club__actions-panel"
                role="menu"
                style={{
                  top: anchor.top,
                  bottom: anchor.bottom,
                  right: anchor.right,
                  maxHeight: anchor.maxHeight,
                }}
              >
                {items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    className={`admin-club__actions-item${item.accent ? ' is-accent' : ''}${item.danger ? ' is-danger' : ''}`}
                    onClick={() => run(item)}
                  >
                    <ActionIcon d={item.icon} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>,
              document.body,
            )
          : null}
      </div>
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
