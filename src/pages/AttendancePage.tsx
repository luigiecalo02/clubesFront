import { useEffect, useMemo, useRef, useState } from 'react'
import { attendanceApi } from '../api/attendance'
import { isSameRanking, subscribeAttendanceChanged } from '../api/attendanceLive'
import { resolveFileUrl } from '../api/baseUrl'
import { getApiErrorMessage } from '../api/client'
import type {
  AttendanceEstado,
  AttendanceEvent,
  AttendanceMember,
  AttendanceRanking,
} from '../api/types'
import { AdminIcon } from '../admin/AdminIcon'
import { canAccessClubAttendance } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import {
  AttendanceMarkList,
  attendancePayloadFromDraft,
  emptyAttendanceDraft,
  memberInitials,
} from '../components/attendance/AttendanceMarkList'
import { AttendanceRankList } from '../components/attendance/AttendanceRankList'
import { formatEventChipDate } from '../components/attendance/AttendanceEventSelect'
import { isEconomicEvent } from '../components/events/EventCard'
import { boundsForMonth, formatDateRange, monthKey } from '../theme/dates'
import { AppPanel } from '../theme/AppPanel'
import { CreateDrawer } from '../theme/CreateDrawer'
import { useNotice } from '../theme/NoticeProvider'
import '../theme/attendance-rank.css'
import '../theme/attendance-mark.css'

type AttendanceTab = 'resultados' | 'tomar'
type EventFilter = 'pendientes' | 'tomados'

const MOBILE_ATTENDANCE = '(max-width: 900px)'

function hasTakenAttendance(item: AttendanceEvent): boolean {
  return (item.asistencias_count ?? 0) > 0 || (item.presentes_count ?? 0) > 0
}

export function AttendancePage() {
  const auth = useAuth()
  const ctx = auth.user?.contexto
  const canEdit =
    canAccessClubAttendance({
      rolName: ctx?.rol_name,
      organizacionId: ctx?.organizacion_id,
    }) || auth.can('asistencia.update')

  const [tab, setTab] = useState<AttendanceTab>('resultados')
  const [events, setEvents] = useState<AttendanceEvent[]>([])
  const [eventoId, setEventoId] = useState<number | null>(null)
  const [members, setMembers] = useState<AttendanceMember[]>([])
  const [ranking, setRanking] = useState<AttendanceRanking | null>(null)
  const [draft, setDraft] = useState<Record<number, AttendanceEstado | ''>>({})
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [loadingRanking, setLoadingRanking] = useState(true)
  const monthStart = boundsForMonth(monthKey())
  const [desde, setDesde] = useState(monthStart.from)
  const [hasta, setHasta] = useState(monthStart.to)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [eventFilter, setEventFilter] = useState<EventFilter>('pendientes')
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_ATTENDANCE).matches : false,
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const notices = useNotice()
  const draftRef = useRef(draft)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveSeq = useRef(0)
  draftRef.current = draft
  const attendanceEvents = useMemo(() => events.filter((item) => !isEconomicEvent(item)), [events])
  const pendingEvents = useMemo(
    () => attendanceEvents.filter((item) => !hasTakenAttendance(item)),
    [attendanceEvents],
  )
  const takenEvents = useMemo(() => attendanceEvents.filter(hasTakenAttendance), [attendanceEvents])
  const boardEvents = eventFilter === 'pendientes' ? pendingEvents : takenEvents
  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return boardEvents
    return boardEvents.filter((item) => {
      const haystack = `${item.name} ${formatEventChipDate(item.starts_at)}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [boardEvents, query])
  const selectedEvent = attendanceEvents.find((item) => item.id === eventoId) ?? null

  useEffect(() => {
    let cancelled = false
    setLoadingEvents(true)
    attendanceApi
      .events()
      .then((next) => {
        if (cancelled) return
        setEvents(next)
        setEventoId((current) => {
          if (!current) return null
          return next.some((item) => item.id === current) ? current : null
        })
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar los eventos'))
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false)
      })
    return () => {
      cancelled = true
    }
  }, [ctx?.organizacion_id, notices])

  function applyRanking(next: AttendanceRanking) {
    setRanking((current) => (isSameRanking(current, next) ? current : next))
  }

  function loadRanking(silent = false) {
    if (!silent) setLoadingRanking(true)
    attendanceApi
      .ranking({ desde, hasta })
      .then((next) => applyRanking(next))
      .catch((err) => {
        if (!silent) notices.error(getApiErrorMessage(err, 'No se pudo cargar el resumen de asistencia'))
      })
      .finally(() => {
        if (!silent) setLoadingRanking(false)
      })
  }

  useEffect(() => {
    loadRanking()
  }, [ctx?.organizacion_id, desde, hasta])

  useEffect(() => {
    const media = window.matchMedia(MOBILE_ATTENDANCE)
    const sync = () => {
      setIsMobile(media.matches)
      if (!media.matches) setDrawerOpen(false)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    let cancelled = false

    function refresh() {
      if (cancelled || document.hidden) return
      attendanceApi
        .ranking({ desde, hasta })
        .then((next) => {
          if (!cancelled) applyRanking(next)
        })
        .catch(() => undefined)
    }

    const unsubscribe = subscribeAttendanceChanged(refresh)
    const timer =
      tab === 'resultados' ? window.setInterval(refresh, 3500) : null
    document.addEventListener('visibilitychange', refresh)

    return () => {
      cancelled = true
      unsubscribe()
      if (timer) window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [tab, ctx?.organizacion_id, desde, hasta])

  useEffect(() => {
    if (!eventoId) {
      setMembers([])
      draftRef.current = {}
      setDraft({})
      return
    }
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    saveSeq.current += 1
    setSaving(false)
    let cancelled = false
    setLoadingRoster(true)
    attendanceApi
      .roster(eventoId)
      .then((next) => {
        if (cancelled) return
        setMembers(next.integrantes)
        const nextDraft = emptyAttendanceDraft(next.integrantes)
        draftRef.current = nextDraft
        setDraft(nextDraft)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar la asistencia'))
      })
      .finally(() => {
        if (!cancelled) setLoadingRoster(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventoId, notices])

  function pickEvent(id: number) {
    setEventoId(id)
    if (isMobile) setDrawerOpen(true)
  }

  function closeAttendanceDrawer() {
    setDrawerOpen(false)
    if (isMobile) setEventoId(null)
  }

  function changeEventFilter(next: EventFilter) {
    if (next === eventFilter) return
    setEventFilter(next)
    setQuery('')
  }

  function setEstado(personaId: number, estado: AttendanceEstado | '') {
    const next = { ...draftRef.current, [personaId]: estado }
    draftRef.current = next
    setDraft(next)
    queueSave(next)
  }

  function markAll(estado: AttendanceEstado | '') {
    const next = Object.fromEntries(members.map((row) => [row.persona_id, estado]))
    draftRef.current = next
    setDraft(next)
    queueSave(next)
  }

  function queueSave(nextDraft: Record<number, AttendanceEstado | ''>) {
    if (!eventoId || !canEdit) return
    const id = eventoId
    setSaving(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      void persist(id, nextDraft)
    }, 220)
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  async function persist(id: number, nextDraft: Record<number, AttendanceEstado | ''>) {
    if (!canEdit) return
    const seq = ++saveSeq.current
    setSaving(true)
    try {
      const { presentes, puntuales, justificados } = attendancePayloadFromDraft(members, nextDraft)
      const next = await attendanceApi.save(id, presentes, justificados, puntuales)
      if (seq !== saveSeq.current) return
      setMembers(next.integrantes)
      const saved = emptyAttendanceDraft(next.integrantes)
      draftRef.current = saved
      setDraft(saved)
      setEvents((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                presentes_count: next.resumen.presentes,
                integrantes_count: next.resumen.total,
                asistencias_count: next.resumen.total - next.resumen.sin_marcar,
              }
            : item,
        ),
      )
    } catch (err) {
      if (seq !== saveSeq.current) return
      notices.error(getApiErrorMessage(err, 'No se pudo guardar la asistencia'))
    } finally {
      if (seq === saveSeq.current) setSaving(false)
    }
  }

  const markContent = (
    <>
      {!selectedEvent ? (
        <p className="app-panel__hint">Elige un evento para tomar asistencia.</p>
      ) : null}

      {selectedEvent ? (
        <header className="attendance-detail__head">
          <span className="attendance-mark__avatar is-square" aria-hidden="true">
            {resolveFileUrl(selectedEvent.image_url) ? (
              <img src={resolveFileUrl(selectedEvent.image_url)} alt="" />
            ) : (
              memberInitials(selectedEvent.name)
            )}
          </span>
          <div>
            <h3>{selectedEvent.name}</h3>
            <p>{formatEventChipDate(selectedEvent.starts_at)}</p>
          </div>
          <p className="attendance-detail__total">
            <strong>
              {selectedEvent.presentes_count ?? 0}/{selectedEvent.integrantes_count ?? 0}
            </strong>
            <span>Asistieron</span>
          </p>
        </header>
      ) : null}

      {selectedEvent && loadingRoster ? <p className="app-panel__muted">Cargando integrantes…</p> : null}

      {selectedEvent && !loadingRoster && members.length === 0 ? (
        <p className="app-panel__muted">Este club todavía no tiene integrantes para marcar asistencia.</p>
      ) : null}

      {selectedEvent && !loadingRoster && members.length ? (
        <AttendanceMarkList
          members={members}
          draft={draft}
          canEdit={canEdit}
          saving={saving}
          onEstado={setEstado}
          onMarkAll={markAll}
          showSave={false}
        />
      ) : null}
    </>
  )

  return (
    <section className="admin-page admin-page--attendance">
      <div className="admin-event-tabs" role="tablist" aria-label="Asistencia">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'resultados'}
          className={`admin-events__view${tab === 'resultados' ? ' is-on' : ''}`}
          onClick={() => setTab('resultados')}
        >
          <AdminIcon name="users" />
          Resultados
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tomar'}
          className={`admin-events__view${tab === 'tomar' ? ' is-on' : ''}`}
          onClick={() => setTab('tomar')}
        >
          <AdminIcon name="check" />
          Tomar asistencia
        </button>
      </div>

      {tab === 'resultados' ? (
        <AppPanel className="admin-attendance-rank" shine={false}>
          <p className="app-panel__kicker">Resumen</p>
          <h2 className="app-panel__title">Asistencia del club</h2>
          <p className="app-panel__subtitle">
            Integrantes de mayor a menor. Si empatan en asistencias, gana quien tenga más
            puntualidades. El ranking usa el mes actual y puedes cambiarlo a un rango de fechas.
            Se actualiza en vivo al marcar desde esta página, Eventos u otra pestaña. {formatDateRange(desde, hasta)}
            {' · '}
            {ranking?.eventos ?? 0} evento
            {(ranking?.eventos ?? 0) === 1 ? '' : 's'} con asistencia.
          </p>
          <AttendanceRankList
            ranking={ranking}
            loading={loadingRanking}
            from={desde}
            to={hasta}
            onRangeChange={(nextFrom, nextTo) => {
              setDesde(nextFrom)
              setHasta(nextTo)
            }}
          />
        </AppPanel>
      ) : null}

      {tab === 'tomar' && loadingEvents ? <p className="admin-empty">Cargando eventos…</p> : null}

      {tab === 'tomar' && !loadingEvents && attendanceEvents.length === 0 ? (
        <AppPanel>
          <p className="app-panel__kicker">Agenda</p>
          <h2 className="app-panel__title">No hay eventos</h2>
          <p className="app-panel__subtitle">
            Crea un evento en Eventos para poder relacionar la asistencia de los integrantes.
          </p>
        </AppPanel>
      ) : null}

      {tab === 'tomar' && attendanceEvents.length ? (
        <>
          <div className="attendance-workspace__grid">
            <AppPanel shine={false} className="attendance-board">
              <div className="admin-event-tabs" role="tablist" aria-label="Eventos de asistencia">
                <button
                  type="button"
                  role="tab"
                  aria-selected={eventFilter === 'pendientes'}
                  className={`admin-events__view${eventFilter === 'pendientes' ? ' is-on' : ''}`}
                  onClick={() => changeEventFilter('pendientes')}
                >
                  <AdminIcon name="calendar" />
                  Por pasar lista
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={eventFilter === 'tomados'}
                  className={`admin-events__view${eventFilter === 'tomados' ? ' is-on' : ''}`}
                  onClick={() => changeEventFilter('tomados')}
                >
                  <AdminIcon name="check" />
                  Ya pasaron lista
                </button>
              </div>

              <label className="attendance-search">
                Buscar
                <span className="app-panel__field">
                  <AdminIcon name="calendar" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar evento por nombre o fecha…"
                  />
                </span>
              </label>

              <p className="attendance-board__meta">
                Se encontraron {filteredEvents.length} evento{filteredEvents.length === 1 ? '' : 's'}
              </p>

              {filteredEvents.length === 0 ? (
                <p className="app-panel__hint">
                  {boardEvents.length === 0
                    ? eventFilter === 'pendientes'
                      ? 'No hay eventos pendientes de pasar lista.'
                      : 'Todavía no hay eventos con asistencia registrada.'
                    : 'Ningún evento coincide con esa búsqueda.'}
                </p>
              ) : null}

              <div className="attendance-picks">
                {filteredEvents.map((item) => {
                  const photo = resolveFileUrl(item.image_url)
                  const presentes = item.presentes_count ?? 0
                  const total = item.integrantes_count ?? 0
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`attendance-pick${item.id === eventoId ? ' is-on' : ''}`}
                      onClick={() => pickEvent(item.id)}
                    >
                      <span className="attendance-mark__avatar is-square" aria-hidden="true">
                        {photo ? <img src={photo} alt="" /> : memberInitials(item.name)}
                      </span>
                      <span className="attendance-pick__who">
                        <strong>{item.name}</strong>
                        <small>{formatEventChipDate(item.starts_at)}</small>
                      </span>
                      <span className="attendance-pick__count">
                        <strong>
                          {presentes}/{total}
                        </strong>
                        <small>Asistieron</small>
                      </span>
                      <AdminIcon name="chevronRight" />
                    </button>
                  )
                })}
              </div>
            </AppPanel>

            {!isMobile ? (
              <AppPanel shine={false} className="attendance-detail">
                {markContent}
              </AppPanel>
            ) : null}
          </div>

          {isMobile ? (
            <CreateDrawer
              open={drawerOpen && Boolean(selectedEvent)}
              title={selectedEvent?.name || 'Tomar asistencia'}
              subtitle={selectedEvent ? formatEventChipDate(selectedEvent.starts_at) : 'Asistencia'}
              placement="bottom"
              onClose={closeAttendanceDrawer}
            >
              <div className="attendance-detail">{markContent}</div>
            </CreateDrawer>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
