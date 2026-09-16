import { AdminIcon } from '../../admin/AdminIcon'
import { resolveFileUrl } from '../../api/baseUrl'
import type { EventSummary } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'
import { EventCountdown } from './EventCountdown'

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  publicado: 'Publicado',
  en_proceso: 'En proceso',
  cerrado: 'Finalizado',
  cancelado: 'Cancelado',
}

const VISIBILIDAD_LABELS: Record<string, string> = {
  publico: 'Libre',
  organizacion: 'Organización',
  privado: 'Privado',
}

export function isActivityEvent(item: EventSummary): boolean {
  const slug = item.tipo_evento?.slug?.toLowerCase() ?? ''
  const name = item.tipo_evento?.nombre?.toLowerCase() ?? ''
  return slug === 'actividad' || name === 'actividad'
}

export function formatEventRange(start?: string | null, end?: string | null): string {
  if (!start) return 'Sin fecha'
  const from = new Date(start)
  const to = end ? new Date(end) : null
  const day = new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  if (!to || Number.isNaN(to.getTime()) || from.toDateString() === to.toDateString()) {
    return day.format(from)
  }
  return `${day.format(from)} – ${day.format(to)}`
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
  if (!showAttendance && !canEdit) return null

  return (
    <>
      {showAttendance ? (
        <button type="button" className="app-panel__btn--primary" onClick={() => onAttendance(item)}>
          Asistencia
        </button>
      ) : null}
      {canEdit ? (
        <button
          type="button"
          className={showAttendance ? 'app-panel__btn--ghost' : 'app-panel__btn--primary'}
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
      {banner ? <img src={banner} alt="" className="admin-event-card__banner" /> : null}
      {logo ? <img src={logo} alt="" className="admin-event-card__logo" /> : null}
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
