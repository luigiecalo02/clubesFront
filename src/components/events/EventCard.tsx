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

const VISIBILIDAD_LABELS: Record<string, string> = {
  publico: 'Libre',
  organizacion: 'Organización',
  privado: 'Privado',
}

export const ECONOMIC_EVENT_SLUG = 'actividad-economica'

export function isActivityEvent(item: EventSummary): boolean {
  const slug = item.tipo_evento?.slug?.toLowerCase() ?? ''
  const name = item.tipo_evento?.nombre?.toLowerCase() ?? ''
  return slug === 'actividad' || name === 'actividad'
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

export function formatEventRange(start?: string | null, end?: string | null): string {
  return formatDateRange(start, end)
}

type EventCardActionsProps = {
  item: EventSummary
  canTakeAttendance: boolean
  canEdit: boolean
  onAttendance: (item: EventSummary) => void
  onEdit: (item: EventSummary) => void
}

export function EventCardActions({
  item,
  canTakeAttendance,
  canEdit,
  onAttendance,
  onEdit,
}: EventCardActionsProps) {
  const showAttendance = canTakeAttendance && isActivityEvent(item)
  const showParticipants = canTakeAttendance && isEconomicEvent(item)
  if (!showAttendance && !showParticipants && !canEdit) return null

  return (
    <>
      {showAttendance ? (
        <button type="button" className="app-panel__btn--primary" onClick={() => onAttendance(item)}>
          Asistencia
        </button>
      ) : null}
      {showParticipants ? (
        <button type="button" className="app-panel__btn--primary" onClick={() => onAttendance(item)}>
          Participantes
        </button>
      ) : null}
      {canEdit ? (
        <button
          type="button"
          className={showAttendance || showParticipants ? 'app-panel__btn--ghost' : 'app-panel__btn--primary'}
          onClick={() => onEdit(item)}
        >
          Editar
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
}

export function EventCard({
  item,
  now,
  canTakeAttendance,
  canEdit,
  onAttendance,
  onEdit,
  framed = true,
  showHeading = true,
  showActions = true,
  showMedia = true,
}: EventCardProps) {
  const banner = showMedia ? resolveFileUrl(item.banner_url) : null
  const logo = showMedia ? resolveFileUrl(item.image_url) : null
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
          <p className="app-panel__kicker">
            {item.tipo_evento?.nombre || ESTADO_LABELS[item.estado ?? ''] || 'Evento'}
          </p>
          <h2 className="app-panel__title">{item.name}</h2>
        </>
      ) : (
        <p className="app-panel__kicker">
          {item.tipo_evento?.nombre || ESTADO_LABELS[item.estado ?? ''] || 'Evento'}
        </p>
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
        <p className="admin-event-card__fact">
          <strong>{item.inscritos_count ?? 0}</strong>
          <span>Inscritos</span>
        </p>
        <p className="admin-event-card__fact">
          <strong>{ESTADO_LABELS[item.estado ?? ''] || item.estado || 'Evento'}</strong>
          <span>{VISIBILIDAD_LABELS[item.visibilidad ?? ''] || 'Alcance'}</span>
        </p>
      </div>
      <EventCountdown start={item.starts_at} end={item.ends_at} now={now} />
      {showActions ? (
        <div className="admin-event-card__actions">
          <EventCardActions
            item={item}
            canTakeAttendance={canTakeAttendance}
            canEdit={canEdit}
            onAttendance={onAttendance}
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
