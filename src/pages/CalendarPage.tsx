import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { resolveFileUrl } from '../api/baseUrl'
import { getApiErrorMessage } from '../api/client'
import { eventsApi } from '../api/events'
import type { EventSummary } from '../api/types'
import { AdminIcon } from '../admin/AdminIcon'
import { EventCountdown, useNow } from '../components/events/EventCountdown'
import { AppPanel } from '../theme/AppPanel'
import '../theme/calendar.css'
import {
  buildMonthGrid,
  eventSpanSlice,
  eventsForDay,
  eventsForMonth,
  formatDayLabel,
  monthTitle,
  toDateKey,
} from './calendarMonth'

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function chipColor(item: EventSummary): string | undefined {
  return item.tipo_evento?.color || undefined
}

function eventBanner(item: EventSummary): string | null {
  return resolveFileUrl(item.banner_url)
}

function eventLogo(item: EventSummary): string | null {
  return resolveFileUrl(item.image_url)
}

function formatRange(start?: string | null, end?: string | null): string {
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

export function CalendarPage() {
  const now = useNow()
  const today = new Date()
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }))
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(toDateKey(today))
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    eventsApi
      .list()
      .then((next) => {
        if (!cancelled) setEvents(next)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudieron cargar los eventos'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const days = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month, today),
    [cursor.month, cursor.year],
  )
  const monthEvents = useMemo(
    () => eventsForMonth(events, cursor.year, cursor.month),
    [cursor.month, cursor.year, events],
  )
  const selectedDate = useMemo(() => {
    const match = days.find((day) => day.key === selectedDay)
    return match?.date ?? new Date(cursor.year, cursor.month, 1)
  }, [cursor.month, cursor.year, days, selectedDay])
  const dayEvents = useMemo(() => eventsForDay(events, selectedDate), [events, selectedDate])
  const selected = monthEvents.find((item) => item.id === selectedId) ?? dayEvents[0] ?? null
  const types = new Set(monthEvents.map((item) => item.tipo_evento?.nombre).filter(Boolean))

  function goMonth(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
    setSelectedDay(toDateKey(next))
    setSelectedId(null)
  }

  function goToday() {
    setCursor({ year: today.getFullYear(), month: today.getMonth() })
    setSelectedDay(toDateKey(today))
    setSelectedId(null)
  }

  return (
    <section className="admin-page admin-page--calendar">
      <AppPanel className="admin-calendar" shine={false}>
        <div className="admin-calendar__toolbar">
          <h2 className="app-panel__title">{monthTitle(cursor.year, cursor.month)}</h2>
          <div className="admin-calendar__nav">
            <button type="button" className="app-panel__btn--ghost" onClick={() => goMonth(-1)}>
              Mes anterior
            </button>
            <button type="button" className="app-panel__btn--ghost" onClick={goToday}>
              Hoy
            </button>
            <button type="button" className="app-panel__btn--ghost" onClick={() => goMonth(1)}>
              Mes siguiente
            </button>
          </div>
        </div>

        <p className="admin-calendar__summary">
          {loading
            ? 'Cargando cronograma…'
            : `${monthEvents.length} evento${monthEvents.length === 1 ? '' : 's'} este mes${
                types.size ? ` · ${types.size} tipo${types.size === 1 ? '' : 's'}` : ''
              }`}
        </p>

        {error ? (
          <p className="admin-form__alert" role="alert">
            {error}
          </p>
        ) : null}

        <div className="admin-calendar__scroller">
          <div className="admin-calendar__week">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="admin-calendar__grid">
            {days.map((day) => {
              const items = eventsForDay(events, day.date)
              const fullDay = items.length === 1
              const splitDay = items.length >= 2
              const visible = items.slice(0, splitDay ? 2 : 1)
              const leadSlice = items[0] ? eventSpanSlice(items[0], day.date) : null
              const daySpan = Boolean(fullDay && leadSlice?.multiDay && leadSlice.length > 1)
              return (
                <button
                  key={day.key}
                  type="button"
                  className={`admin-calendar__day${day.inMonth ? '' : ' is-out'}${
                    day.isToday ? ' is-today' : ''
                  }${selectedDay === day.key ? ' is-on' : ''}${fullDay ? ' is-full' : ''}${
                    splitDay ? ' is-split' : ''
                  }${daySpan ? ` is-span is-span-${leadSlice?.role}` : ''}`}
                  onClick={() => {
                    setSelectedDay(day.key)
                    setSelectedId(items[0]?.id ?? null)
                  }}
                >
                  <span className="admin-calendar__num">{day.date.getDate()}</span>
                  {visible.map((item) => {
                    const banner = eventBanner(item)
                    const logo = eventLogo(item)
                    const cover = banner || logo
                    const slice = eventSpanSlice(item, day.date)
                    const spanning = slice.multiDay && slice.length > 1
                    const showLogo = Boolean(banner && logo && slice.showLabel)
                    return (
                      <span
                        key={item.id}
                        className={`admin-calendar__chip${fullDay ? ' is-full' : ''}${
                          splitDay ? ' is-split' : ''
                        }${cover ? ' is-cover' : ''}${
                          spanning ? ` is-span is-span-${slice.role}` : ''
                        }`}
                        style={
                          {
                            ...(chipColor(item) ? { '--chip': chipColor(item) } : {}),
                            ...(spanning
                              ? { '--span-len': slice.length, '--span-i': slice.index }
                              : {}),
                          } as CSSProperties
                        }
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedDay(day.key)
                          setSelectedId(item.id)
                        }}
                      >
                        {cover ? <img src={cover} alt="" className="admin-calendar__chip-cover" /> : null}
                        {showLogo ? <img src={logo ?? ''} alt="" className="admin-calendar__chip-logo" /> : null}
                        <em>{item.name}</em>
                      </span>
                    )
                  })}
                  {items.length > 2 ? (
                    <p className="admin-calendar__more">+{items.length - 2} más</p>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </AppPanel>

      <AppPanel className="admin-calendar-detail" shine={false}>
        {selected ? (
          <>
            {resolveFileUrl(selected.banner_url) ? (
              <img src={resolveFileUrl(selected.banner_url) ?? ''} alt="" className="admin-calendar-detail__banner" />
            ) : null}
            {resolveFileUrl(selected.image_url) ? (
              <img src={resolveFileUrl(selected.image_url) ?? ''} alt="" className="admin-calendar-detail__logo" />
            ) : null}
            <p className="app-panel__kicker">{selected.tipo_evento?.nombre || 'Evento'}</p>
            <h2 className="app-panel__title">{selected.name}</h2>
            <div className="admin-calendar-detail__meta">
              <p>
                <AdminIcon name="calendar" />
                <span>{formatRange(selected.starts_at, selected.ends_at)}</span>
              </p>
              {selected.lugar ? (
                <p>
                  <AdminIcon name="map" />
                  <span>{selected.lugar}</span>
                </p>
              ) : null}
              {selected.organizacion?.nombre ? (
                <p>
                  <AdminIcon name="flag" />
                  <span>{selected.organizacion.nombre}</span>
                </p>
              ) : null}
            </div>
            {selected.descripcion ? <p className="app-panel__muted">{selected.descripcion}</p> : null}
            <EventCountdown start={selected.starts_at} end={selected.ends_at} now={now} />
          </>
        ) : (
          <>
            <p className="app-panel__kicker">Resumen</p>
            <h2 className="app-panel__title">{formatDayLabel(selectedDate)}</h2>
            <p className="app-panel__subtitle">
              {loading
                ? 'Cargando eventos…'
                : dayEvents.length
                  ? `${dayEvents.length} evento${dayEvents.length === 1 ? '' : 's'} este día.`
                  : 'No hay eventos este día. Elige otro o cambia de mes.'}
            </p>
          </>
        )}
      </AppPanel>
    </section>
  )
}
