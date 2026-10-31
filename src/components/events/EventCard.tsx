import { useState } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import { resolveFileUrl } from '../../api/baseUrl'
import type { EventSummary } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'
import { formatDateRange } from '../../theme/dates'
import { EventCountdown } from './EventCountdown'

export const ESTADO_LABELS: Record<string, string> = {
  publicado: 'Publicado',
  en_proceso: 'En proceso',
  cerrado: 'Finalizado',
  borrador: 'Borrador',
  cancelado: 'Cancelado',
}

export const EVENT_ESTADO_OPTIONS = Object.entries(ESTADO_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function eventEstadoLabel(estado?: string | null): string {
  return ESTADO_LABELS[estado ?? ''] || estado || ''
}

const VISIBILIDAD_LABELS: Record<string, string> = {
  publico: 'Libre',
  organizacion: 'Organización',
  privado: 'Privado',
}

export const ECONOMIC_EVENT_SLUG = 'actividad-economica'

const INSCRIPCION_SLUGS = ['campamento', 'especialidad', 'clase', 'investidura']
const INSCRIPCION_NOMBRES = ['campamento', 'especialidad', 'investidura']

export function isActivityEvent(item: EventSummary): boolean {
  const slug = item.tipo_evento?.slug?.toLowerCase() ?? ''
  const name = item.tipo_evento?.nombre?.toLowerCase() ?? ''
  return slug === 'actividad' || name === 'actividad'
}

export function isEconomicParticipationLocked(item?: { estado?: string | null } | null): boolean {
  const estado = item?.estado ?? ''
  return estado === 'en_proceso' || estado === 'cerrado'
}

export function isInscribibleEvent(
  item?: {
    tipo_evento?: { slug?: string | null; nombre?: string | null } | null
    slug?: string | null
    nombre?: string | null
  } | null,
): boolean {
  if (!item) return false
  const tipo = item.tipo_evento ?? item
  const slug = tipo.slug?.toLowerCase() ?? ''
  const name = tipo.nombre?.toLowerCase() ?? ''
  return INSCRIPCION_SLUGS.includes(slug) || INSCRIPCION_NOMBRES.includes(name)
}

export function isInscriptionOpen(item?: { estado?: string | null } | null): boolean {
  return item?.estado === 'publicado'
}

export function isEconomicEvent(
  item?: {
    tipo_evento?: { slug?: string | null; nombre?: string | null } | null
    slug?: string | null
    nombre?: string | null
  } | null,
): boolean {
  if (!item) return false
  const tipo = item.tipo_evento ?? item
  const slug = tipo.slug?.toLowerCase() ?? ''
  const name = tipo.nombre?.toLowerCase() ?? ''
  return slug === ECONOMIC_EVENT_SLUG || name === 'actividad económica' || name === 'actividad economica'
}

export function eventRosterFact(item: EventSummary): { total: number; label: string } {
  if (isInscribibleEvent(item)) {
    return { total: item.inscritos_count ?? 0, label: 'Inscritos' }
  }
  if (isEconomicEvent(item)) {
    return { total: item.participantes_count ?? 0, label: 'Participantes' }
  }
  return { total: item.asistentes_count ?? 0, label: 'Asistentes' }
}

export function formatEventRange(start?: string | null, end?: string | null): string {
  return formatDateRange(start, end)
}

function EventCardKicker({ item }: { item: EventSummary }) {
  const tipo = item.tipo_evento?.nombre || 'Evento'
  return <p className="app-panel__kicker admin-event-card__kicker">{tipo}</p>
}

type EventCardActionsProps = {
  item: EventSummary
  canTakeAttendance: boolean
  canJoin?: boolean
  canManageInscriptions?: boolean
  canEdit: boolean
  decorated?: boolean
  onAttendance: (item: EventSummary) => void
  onJoin?: (item: EventSummary) => void
  onInscriptions?: (item: EventSummary) => void
  onEdit: (item: EventSummary) => void
}

export function EventCardActions({
  item,
  canTakeAttendance,
  canJoin = false,
  canManageInscriptions = false,
  canEdit,
  decorated = false,
  onAttendance,
  onJoin,
  onInscriptions,
  onEdit,
}: EventCardActionsProps) {
  const showAttendance = canTakeAttendance && isActivityEvent(item)
  const showParticipants = canTakeAttendance && isEconomicEvent(item)
  const inscriptionOpen = isInscribibleEvent(item) && isInscriptionOpen(item)
  const joinLocked = isEconomicParticipationLocked(item)
  const showJoinEconomic = canJoin && Boolean(onJoin) && isEconomicEvent(item) && item.estado !== 'cancelado'
  const showJoinInscription = canJoin && Boolean(onJoin) && inscriptionOpen
  const showInscriptions = canManageInscriptions && Boolean(onInscriptions) && inscriptionOpen
  const showJoin = showJoinEconomic || showJoinInscription
  if (!showAttendance && !showParticipants && !showJoin && !showInscriptions && !canEdit) return null

  const hasPrimary = showAttendance || showParticipants || showJoin || showInscriptions

  const trailing = decorated ? <AdminIcon name="chevronRight" /> : null

  return (
    <>
      {showAttendance ? (
        <button type="button" className="app-panel__btn--primary" onClick={() => onAttendance(item)}>
          {decorated ? <AdminIcon name="check" /> : null}
          Asistencia
          {trailing}
        </button>
      ) : null}
      {showParticipants ? (
        <button type="button" className="app-panel__btn--primary" onClick={() => onAttendance(item)}>
          {decorated ? <AdminIcon name="eye" /> : null}
          Ver evento
          {trailing}
        </button>
      ) : null}
      {showJoin && onJoin ? (
        <button type="button" className="app-panel__btn--primary" onClick={() => onJoin(item)}>
          {decorated ? <AdminIcon name="pencil" /> : null}
          {showJoinInscription
            ? item.inscrito
              ? 'Mi inscripción'
              : 'Inscribirme'
            : joinLocked
              ? 'Ver'
              : 'Participar'}
          {trailing}
        </button>
      ) : null}
      {showInscriptions && onInscriptions ? (
        <button type="button" className="app-panel__btn--ghost" onClick={() => onInscriptions(item)}>
          {decorated ? <AdminIcon name="users" /> : null}
          Inscritos
          {trailing}
        </button>
      ) : null}
      {canEdit ? (
        <button
          type="button"
          className={hasPrimary ? 'app-panel__btn--ghost' : 'app-panel__btn--primary'}
          onClick={() => onEdit(item)}
        >
          {decorated ? <AdminIcon name="pencil" /> : null}
          Editar
          {trailing}
        </button>
      ) : null}
    </>
  )
}

type EventCardProps = EventCardActionsProps & {
  now: number
  framed?: boolean
  showHeading?: boolean
  showActions?: boolean
  showMedia?: boolean
  canChangeEstado?: boolean
  onEstadoChange?: (item: EventSummary, estado: string) => Promise<void> | void
}

export function EventCard({
  item,
  now,
  canTakeAttendance,
  canJoin = false,
  canManageInscriptions = false,
  canEdit,
  onAttendance,
  onJoin,
  onInscriptions,
  onEdit,
  framed = true,
  showHeading = true,
  showActions = true,
  showMedia = true,
  canChangeEstado = false,
  onEstadoChange,
}: EventCardProps) {
  const [savingEstado, setSavingEstado] = useState(false)
  const estadoValue = item.estado && item.estado in ESTADO_LABELS ? item.estado : 'publicado'

  async function changeEstado(estado: string) {
    if (!onEstadoChange || estado === item.estado || savingEstado) return
    setSavingEstado(true)
    try {
      await onEstadoChange(item, estado)
    } finally {
      setSavingEstado(false)
    }
  }
  const banner = showMedia ? resolveFileUrl(item.banner_url) : null
  const logo = showMedia ? resolveFileUrl(item.image_url) : null
  const roster = eventRosterFact(item)
  const body = (
    <>
      {banner || logo ? (
        <div className={`admin-event-card__media${banner ? ' has-banner' : ''}${logo ? ' has-logo' : ''}`}>
          {banner ? <img src={banner} alt="" className="admin-event-card__banner" /> : null}
          {logo ? <img src={logo} alt="" className="admin-event-card__logo" /> : null}
        </div>
      ) : null}
      {showHeading ? (
        <>
          <EventCardKicker item={item} />
          <h2 className="app-panel__title">{item.name}</h2>
        </>
      ) : (
        <EventCardKicker item={item} />
      )}
      <div className="admin-event-card__meta">
        <p>
          <AdminIcon name="calendar" />
          <span>{formatEventRange(item.starts_at, item.ends_at)}</span>
        </p>
        {item.lugar ? (
          <p>
            <AdminIcon name="map" />
            <span>{item.lugar}</span>
          </p>
        ) : null}
        {item.organizacion?.nombre ? (
          <p>
            <AdminIcon name="flag" />
            <span>{item.organizacion.nombre}</span>
          </p>
        ) : null}
        {item.descripcion ? (
          <p className="admin-event-card__desc">
            <AdminIcon name="tags" />
            <span>{item.descripcion}</span>
          </p>
        ) : null}
      </div>
      <div className="admin-event-card__facts">
        <p className="admin-event-card__fact admin-event-card__fact--count">
          <strong>{roster.total}</strong>
          <span>{roster.label}</span>
        </p>
        <p className={`admin-event-card__fact admin-event-card__fact--estado is-${item.estado ?? ''}`}>
          {canChangeEstado && onEstadoChange ? (
            <select
              className="admin-event-card__estado-select"
              value={estadoValue}
              disabled={savingEstado}
              aria-label="Estado del evento"
              onChange={(event) => void changeEstado(event.target.value)}
            >
              {EVENT_ESTADO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <strong>{eventEstadoLabel(item.estado) || '—'}</strong>
          )}
          <span>Estado</span>
        </p>
        {item.visibilidad ? (
          <p className="admin-event-card__fact">
            <strong>{VISIBILIDAD_LABELS[item.visibilidad] || item.visibilidad}</strong>
            <span>Alcance</span>
          </p>
        ) : null}
      </div>
      <EventCountdown start={item.starts_at} end={item.ends_at} now={now} />
      {showActions ? (
        <div className="admin-event-card__actions">
          <EventCardActions
            item={item}
            canTakeAttendance={canTakeAttendance}
            canJoin={canJoin}
            canManageInscriptions={canManageInscriptions}
            canEdit={canEdit}
            onAttendance={onAttendance}
            onJoin={onJoin}
            onInscriptions={onInscriptions}
            onEdit={onEdit}
          />
        </div>
      ) : null}
    </>
  )

  if (!framed) {
    return <div className="admin-event-card admin-event-card--plain">{body}</div>
  }

  return (
    <AppPanel className="admin-event-card" shine={false}>
      {body}
    </AppPanel>
  )
}
