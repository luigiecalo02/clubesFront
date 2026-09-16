import { useMemo, useState, type CSSProperties } from 'react'
import { resolveFileUrl } from '../api/baseUrl'
import type { EventSummary, EventTipo } from '../api/types'
import { EventBoard } from '../components/events/EventBoard'
import { EventCardActions } from '../components/events/EventCard'
import { AppPanel } from '../theme/AppPanel'
import { CreateDrawer } from '../theme/CreateDrawer'
import '../theme/calendar.css'
import {
  buildMonthGrid,
  eventSpanSlice,
  eventsForDay,
  eventsForMonth,
  monthTitle,
  toDateKey,
} from './calendarMonth'

const WEEKDAYS = [
  { full: 'Dom', mini: 'D', label: 'Domingo' },
  { full: 'Lun', mini: 'L', label: 'Lunes' },
  { full: 'Mar', mini: 'M', label: 'Martes' },
  { full: 'Mié', mini: 'X', label: 'Miércoles' },
  { full: 'Jue', mini: 'J', label: 'Jueves' },
  { full: 'Vie', mini: 'V', label: 'Viernes' },
  { full: 'Sáb', mini: 'S', label: 'Sábado' },
]

function chipColor(item: EventSummary): string | undefined {
  return item.tipo_evento?.color || undefined
}

function eventBanner(item: EventSummary): string | null {
  return resolveFileUrl(item.banner_url)
}

function eventLogo(item: EventSummary): string | null {
  return resolveFileUrl(item.image_url)
}

type EventsCalendarProps = {
  events: EventSummary[]
  loading?: boolean
  error?: string
  now: number
  canTakeAttendance: boolean
  canCreate: boolean
  tipos: EventTipo[]
  organizacionId?: number | null
  onAttendance: (item: EventSummary) => void
  onEdit: (item: EventSummary) => void
}

export function EventsCalendar({
  events,
  loading = false,
  error = '',
  now,
  canTakeAttendance,
  canCreate,
  tipos,
  organizacionId,
  onAttendance,
  onEdit,
}: EventsCalendarProps) {
  const today = new Date()
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }))
  const [selectedDay, setSelectedDay] = useState(toDateKey(today))
  const [openId, setOpenId] = useState<number | null>(null)

  const days = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month, today),
    [cursor.month, cursor.year],
  )
  const monthEvents = useMemo(
    () => eventsForMonth(events, cursor.year, cursor.month),
    [cursor.month, cursor.year, events],
  )
  const selected = events.find((item) => item.id === openId) ?? null
  const types = new Set(monthEvents.map((item) => item.tipo_evento?.nombre).filter(Boolean))
  const canEditSelected = Boolean(
    selected && canCreate && selected.organizacion?.id === organizacionId,
  )

  function closeEvent() {
    setOpenId(null)
  }

  function openEvent(dayKey: string, eventId: number | null) {
    setSelectedDay(dayKey)
    setOpenId(eventId)
  }

  function goMonth(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
    setSelectedDay(toDateKey(next))
    setOpenId(null)
  }

  function goToday() {
    setCursor({ year: today.getFullYear(), month: today.getMonth() })
    setSelectedDay(toDateKey(today))
    setOpenId(null)
  }

  return (
    <section className="admin-page admin-page--calendar">
      <AppPanel className="admin-calendar" shine={false}>
        <div className="admin-calendar__toolbar">
          <h2 className="app-panel__title">{monthTitle(cursor.year, cursor.month)}</h2>
          <div className="admin-calendar__nav">
            <button
              type="button"
              className="app-panel__btn--ghost"
              aria-label="Mes anterior"
              onClick={() => goMonth(-1)}
            >
              <span className="admin-calendar__nav-full">Mes anterior</span>
              <span className="admin-calendar__nav-short" aria-hidden="true">
                ‹
              </span>
            </button>
            <button type="button" className="app-panel__btn--ghost" onClick={goToday}>
              Hoy
            </button>
            <button
              type="button"
              className="app-panel__btn--ghost"
              aria-label="Mes siguiente"
              onClick={() => goMonth(1)}
            >
              <span className="admin-calendar__nav-full">Mes siguiente</span>
              <span className="admin-calendar__nav-short" aria-hidden="true">
                ›
              </span>
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
              <span key={day.label} aria-label={day.label}>
                <span className="admin-calendar__wd-full">{day.full}</span>
                <span className="admin-calendar__wd-mini">{day.mini}</span>
              </span>
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
                  onClick={() => openEvent(day.key, items[0]?.id ?? null)}
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
                          openEvent(day.key, item.id)
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

      <CreateDrawer
        open={Boolean(selected)}
        title={selected?.name || 'Evento'}
        onClose={closeEvent}
        footer={
          selected ? (
            <EventCardActions
              item={selected}
              canTakeAttendance={canTakeAttendance}
              canEdit={canEditSelected}
              onAttendance={(item) => {
                closeEvent()
                onAttendance(item)
              }}
              onEdit={(item) => {
                closeEvent()
                onEdit(item)
              }}
            />
          ) : null
        }
      >
        {selected ? (
          <EventBoard
            item={selected}
            now={now}
            tipos={tipos}
            framed={false}
            showHeading={false}
            showActions={false}
            canTakeAttendance={canTakeAttendance}
            canEdit={canEditSelected}
            canManageSubevents={canEditSelected}
            onAttendance={onAttendance}
            onEdit={onEdit}
          />
        ) : null}
      </CreateDrawer>
    </section>
  )
}
