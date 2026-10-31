import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { AdminIcon, adminIconFromPrime } from '../../admin/AdminIcon'
import { resolveFileUrl } from '../../api/baseUrl'
import type { EventSummary } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'
import {
  EventCardActions,
  eventEstadoLabel,
  eventRosterFact,
  formatEventRange,
} from './EventCard'
import '../../theme/event-carousel.css'

type EventCarouselProps = {
  events: EventSummary[]
  canTakeAttendance: boolean
  canJoin?: boolean
  canManageInscriptions?: boolean
  canEdit: boolean
  organizacionId?: number | null
  onAttendance: (item: EventSummary) => void
  onJoin?: (item: EventSummary) => void
  onInscriptions?: (item: EventSummary) => void
  onEdit: (item: EventSummary) => void
}

function posterInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'EV'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function nearestIndex(track: HTMLUListElement): number {
  const center = track.scrollLeft + track.clientWidth / 2
  let best = 0
  let bestDist = Number.POSITIVE_INFINITY
  Array.from(track.children).forEach((node, index) => {
    const slide = node as HTMLElement
    const mid = slide.offsetLeft + slide.offsetWidth / 2
    const dist = Math.abs(mid - center)
    if (dist < bestDist) {
      best = index
      bestDist = dist
    }
  })
  return best
}

export function EventCarousel({
  events,
  canTakeAttendance,
  canJoin = false,
  canManageInscriptions = false,
  canEdit,
  organizacionId,
  onAttendance,
  onJoin,
  onInscriptions,
  onEdit,
}: EventCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null)
  const dragRef = useRef({ pointer: -1, x: 0, scroll: 0, moved: false })
  const [activeIndex, setActiveIndex] = useState(0)
  const selected = events[Math.min(activeIndex, Math.max(events.length - 1, 0))] ?? events[0]
  const roster = selected ? eventRosterFact(selected) : null
  const own = selected?.organizacion?.id === organizacionId

  function goTo(index: number) {
    const track = trackRef.current
    const slide = track?.children[index] as HTMLElement | undefined
    if (!track || !slide) return
    const left = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2
    track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    setActiveIndex(index)
  }

  useEffect(() => {
    if (activeIndex >= events.length) setActiveIndex(Math.max(0, events.length - 1))
  }, [activeIndex, events.length])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    function onWheel(event: WheelEvent) {
      if (!track || event.ctrlKey) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      track.scrollBy({ left: event.deltaY })
    }
    let frame = 0
    function onScroll() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!track) return
        setActiveIndex(nearestIndex(track))
      })
    }
    track.addEventListener('wheel', onWheel, { passive: false })
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      track.removeEventListener('wheel', onWheel)
      track.removeEventListener('scroll', onScroll)
    }
  }, [events.length])

  function onPointerDown(event: PointerEvent<HTMLUListElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const track = trackRef.current
    if (!track) return
    dragRef.current = { pointer: event.pointerId, x: event.clientX, scroll: track.scrollLeft, moved: false }
  }

  function onPointerMove(event: PointerEvent<HTMLUListElement>) {
    const drag = dragRef.current
    const track = trackRef.current
    if (!track || drag.pointer !== event.pointerId) return
    const dx = event.clientX - drag.x
    if (!drag.moved && Math.abs(dx) < 8) return
    if (!drag.moved) {
      drag.moved = true
      track.classList.add('is-dragging')
      track.setPointerCapture(event.pointerId)
    }
    track.scrollLeft = drag.scroll - dx
  }

  function onPointerUp(event: PointerEvent<HTMLUListElement>) {
    const drag = dragRef.current
    const track = trackRef.current
    if (drag.pointer !== event.pointerId) return
    track?.classList.remove('is-dragging')
    const moved = drag.moved
    dragRef.current = { pointer: -1, x: 0, scroll: 0, moved }
    if (moved && track) goTo(nearestIndex(track))
  }

  if (!selected) return null

  return (
    <div className="event-carousel">
      <div className="event-carousel__stage">
        <ul
          className="event-carousel__track"
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {events.map((item, index) => {
            const banner = resolveFileUrl(item.banner_url)
            const logo = resolveFileUrl(item.image_url)
            const tipo = item.tipo_evento?.nombre || 'Evento'
            const tipoIcon = adminIconFromPrime(item.tipo_evento?.icono) ?? 'tags'
            const badgeStyle = item.tipo_evento?.color
              ? ({ '--badge': item.tipo_evento.color } as CSSProperties)
              : undefined
            return (
              <li
                key={item.id}
                className={`event-carousel__slide${index === activeIndex ? ' is-active' : ''}`}
              >
                <button
                  type="button"
                  className="event-carousel__poster"
                  aria-current={index === activeIndex ? true : undefined}
                  aria-label={item.name}
                  onClick={() => {
                    if (dragRef.current.moved) return
                    goTo(index)
                  }}
                >
                  {banner ? (
                    <img src={banner} alt="" className="event-carousel__banner" />
                  ) : (
                    <span>{posterInitials(item.name)}</span>
                  )}
                  <em className="event-carousel__badge" style={badgeStyle}>
                    <AdminIcon name={tipoIcon} />
                    {tipo}
                  </em>
                  {logo ? <img src={logo} alt="" className="event-carousel__logo" /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {events.length > 1 ? (
        <div className="event-carousel__dots" role="tablist" aria-label="Eventos">
          {events.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={item.name}
              className={`event-carousel__dot${index === activeIndex ? ' is-on' : ''}`}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      ) : null}

      <AppPanel className="event-carousel__detail" shine={false}>
        <div className="event-carousel__info">
          <h2 className="app-panel__title">{selected.name}</h2>
          <p>
            <AdminIcon name="calendar" />
            <span>{formatEventRange(selected.starts_at, selected.ends_at) || 'Sin fecha'}</span>
          </p>
          {selected.lugar ? (
            <p>
              <AdminIcon name="map" />
              <span>Lugar: {selected.lugar}</span>
            </p>
          ) : null}
          <p>
            <AdminIcon name="idCard" />
            <span>Evento: {eventEstadoLabel(selected.estado) || '—'}</span>
          </p>
          {roster ? (
            <p>
              <AdminIcon name="users" />
              <span>{`${roster.label}: ${roster.total}`}</span>
            </p>
          ) : null}
        </div>
        <div className="event-carousel__actions">
          <EventCardActions
            item={selected}
            canTakeAttendance={canTakeAttendance}
            canJoin={canJoin}
            canManageInscriptions={canManageInscriptions}
            canEdit={canEdit && own}
            decorated
            onAttendance={onAttendance}
            onJoin={onJoin}
            onInscriptions={onInscriptions}
            onEdit={onEdit}
          />
        </div>
      </AppPanel>
    </div>
  )
}
