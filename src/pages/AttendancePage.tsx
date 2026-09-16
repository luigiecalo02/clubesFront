import { useEffect, useMemo, useRef, useState } from 'react'
import { attendanceApi } from '../api/attendance'
import { isSameRanking, subscribeAttendanceChanged } from '../api/attendanceLive'
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
} from '../components/attendance/AttendanceMarkList'
import { AttendanceRankList } from '../components/attendance/AttendanceRankList'
import { AttendanceEventSelect } from '../components/attendance/AttendanceEventSelect'
import { AppPanel } from '../theme/AppPanel'
import { useNotice } from '../theme/NoticeProvider'
import '../theme/attendance-rank.css'
import '../theme/attendance-mark.css'

type AttendanceTab = 'resultados' | 'tomar'

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
  const [saving, setSaving] = useState(false)
  const notices = useNotice()
  const draftRef = useRef(draft)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveSeq = useRef(0)
  draftRef.current = draft
  const pendingEvents = useMemo(() => events.filter((item) => !hasTakenAttendance(item)), [events])
  const takenEvents = useMemo(() => events.filter(hasTakenAttendance), [events])

  useEffect(() => {
    let cancelled = false
    setLoadingEvents(true)
    attendanceApi
      .events()
      .then((next) => {
        if (cancelled) return
        setEvents(next)
        setEventoId((current) => {
          if (current) return current
          const pending = next.find((item) => !hasTakenAttendance(item))
          return pending?.id ?? next[0]?.id ?? null
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
      .ranking()
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
  }, [ctx?.organizacion_id])

  useEffect(() => {
    let cancelled = false

    function refresh() {
      if (cancelled || document.hidden) return
      attendanceApi
        .ranking()
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
  }, [tab, ctx?.organizacion_id])

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
            puntualidades. Se actualiza en vivo al marcar desde esta página, Eventos u otra
            pestaña. Sobre {ranking?.eventos ?? 0} evento
            {(ranking?.eventos ?? 0) === 1 ? '' : 's'} con asistencia registrada.
          </p>
          <AttendanceRankList ranking={ranking} loading={loadingRanking} />
        </AppPanel>
      ) : null}

      {tab === 'tomar' && loadingEvents ? <p className="admin-empty">Cargando eventos…</p> : null}

      {tab === 'tomar' && !loadingEvents && events.length === 0 ? (
        <AppPanel>
          <p className="app-panel__kicker">Agenda</p>
          <h2 className="app-panel__title">No hay eventos</h2>
          <p className="app-panel__subtitle">
            Crea un evento en Eventos para poder relacionar la asistencia de los integrantes.
          </p>
        </AppPanel>
      ) : null}

      {tab === 'tomar' && events.length ? (
        <AppPanel className="admin-attendance" shine={false}>
          <p className="app-panel__kicker">Evento</p>
          <h2 className="app-panel__title">Tomar asistencia</h2>
          <p className="app-panel__subtitle">
            Elige el evento. Marca asistió y, si llegó a tiempo, puntual; se guarda al instante. Si
            no marcas nada, se asume que no asistió.
          </p>

          <div className="attendance-events-groups">
            <AttendanceEventSelect
              items={pendingEvents}
              eventoId={eventoId}
              label="Por pasar lista"
              onSelect={setEventoId}
            />
            <AttendanceEventSelect
              items={takenEvents}
              eventoId={eventoId}
              label="Ya pasaron lista"
              onSelect={setEventoId}
            />
          </div>

          {loadingRoster ? <p className="app-panel__muted">Cargando integrantes…</p> : null}

          {!loadingRoster && members.length === 0 ? (
            <p className="app-panel__muted">Este club todavía no tiene integrantes para marcar asistencia.</p>
          ) : null}

          {!loadingRoster && members.length ? (
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
        </AppPanel>
      ) : null}
    </section>
  )
}
