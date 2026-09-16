import { useEffect, useState } from 'react'
import { attendanceApi } from '../api/attendance'
import { getApiErrorMessage } from '../api/client'
import type {
  AttendanceEstado,
  AttendanceEvent,
  AttendanceMember,
  AttendanceRanking,
} from '../api/types'
import { canAccessClubAttendance } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import {
  AttendanceMarkList,
  emptyAttendanceDraft,
} from '../components/attendance/AttendanceMarkList'
import { AttendanceRankList } from '../components/attendance/AttendanceRankList'
import { AppPanel } from '../theme/AppPanel'
import '../theme/attendance-rank.css'
import '../theme/attendance-mark.css'

function formatChipDate(start?: string | null): string {
  if (!start) return 'Sin fecha'
  const from = new Date(start)
  if (Number.isNaN(from.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(from)
}


export function AttendancePage() {
  const auth = useAuth()
  const ctx = auth.user?.contexto
  const canEdit =
    canAccessClubAttendance({
      rolName: ctx?.rol_name,
      organizacionId: ctx?.organizacion_id,
    }) || auth.can('asistencia.update')

  const [events, setEvents] = useState<AttendanceEvent[]>([])
  const [eventoId, setEventoId] = useState<number | null>(null)
  const [members, setMembers] = useState<AttendanceMember[]>([])
  const [ranking, setRanking] = useState<AttendanceRanking | null>(null)
  const [draft, setDraft] = useState<Record<number, AttendanceEstado | ''>>({})
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [loadingRanking, setLoadingRanking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadingEvents(true)
    setError('')
    attendanceApi
      .events()
      .then((next) => {
        if (cancelled) return
        setEvents(next)
        setEventoId((current) => current ?? next[0]?.id ?? null)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudieron cargar los eventos'))
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false)
      })
    return () => {
      cancelled = true
    }
  }, [ctx?.organizacion_id])

  function loadRanking() {
    setLoadingRanking(true)
    attendanceApi
      .ranking()
      .then(setRanking)
      .catch((err) => {
        setError(getApiErrorMessage(err, 'No se pudo cargar el resumen de asistencia'))
      })
      .finally(() => setLoadingRanking(false))
  }

  useEffect(() => {
    loadRanking()
  }, [ctx?.organizacion_id])

  useEffect(() => {
    if (!eventoId) {
      setMembers([])
      setDraft({})
      return
    }
    let cancelled = false
    setLoadingRoster(true)
    setSaved('')
    attendanceApi
      .roster(eventoId)
      .then((next) => {
        if (cancelled) return
        setMembers(next.integrantes)
        setDraft(emptyAttendanceDraft(next.integrantes))
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudo cargar la asistencia'))
      })
      .finally(() => {
        if (!cancelled) setLoadingRoster(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventoId])

  function setEstado(personaId: number, estado: AttendanceEstado | '') {
    setDraft((current) => ({ ...current, [personaId]: estado }))
  }

  function markAll(estado: AttendanceEstado | '') {
    setDraft(Object.fromEntries(members.map((row) => [row.persona_id, estado])))
  }

  async function onSave() {
    if (!eventoId || !canEdit) return
    setError('')
    setSaved('')
    setSaving(true)
    try {
      const presentes = members
        .filter((row) => draft[row.persona_id] === 'presente')
        .map((row) => row.persona_id)
      const justificados = members
        .filter((row) => draft[row.persona_id] === 'justificado')
        .map((row) => row.persona_id)
      const next = await attendanceApi.save(eventoId, presentes, justificados)
      setMembers(next.integrantes)
      setDraft(emptyAttendanceDraft(next.integrantes))
      setEvents((current) =>
        current.map((item) =>
          item.id === eventoId
            ? { ...item, presentes_count: next.resumen.presentes, integrantes_count: next.resumen.total }
            : item,
        ),
      )
      setSaved('Asistencia guardada.')
      loadRanking()
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo guardar la asistencia'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-page admin-page--attendance">
      {error ? (
        <p className="admin-form__alert" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="admin-form__ok" role="status">
          {saved}
        </p>
      ) : null}

      {loadingEvents ? <p className="admin-empty">Cargando eventos…</p> : null}

      <AppPanel className="admin-attendance-rank" shine={false}>
        <p className="app-panel__kicker">Resumen</p>
        <h2 className="app-panel__title">Asistencia del club</h2>
        <p className="app-panel__subtitle">
          Integrantes de menor a mayor. El porcentaje es sobre{' '}
          {ranking?.eventos ?? 0} evento{(ranking?.eventos ?? 0) === 1 ? '' : 's'} con asistencia
          registrada.
        </p>
        <AttendanceRankList ranking={ranking} loading={loadingRanking} />
      </AppPanel>

      {!loadingEvents && events.length === 0 ? (
        <AppPanel>
          <p className="app-panel__kicker">Agenda</p>
          <h2 className="app-panel__title">No hay eventos</h2>
          <p className="app-panel__subtitle">
            Crea un evento en Eventos para poder relacionar la asistencia de los integrantes.
          </p>
        </AppPanel>
      ) : null}

      {events.length ? (
        <AppPanel className="admin-attendance" shine={false}>
          <p className="app-panel__kicker">Evento</p>
          <h2 className="app-panel__title">Tomar asistencia</h2>
          <p className="app-panel__subtitle">
            Elige el evento. Marca asistió o excusa; si no marcas nada, se asume que no asistió.
          </p>

          <div className="attendance-events" role="listbox" aria-label="Eventos">
            {events.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === eventoId}
                className={`attendance-events__chip${item.id === eventoId ? ' is-on' : ''}`}
                onClick={() => setEventoId(item.id)}
              >
                <strong>{item.name}</strong>
                <small>
                  {formatChipDate(item.starts_at)}
                  {typeof item.presentes_count === 'number'
                    ? ` · ${item.presentes_count}/${item.integrantes_count ?? 0}`
                    : ''}
                </small>
              </button>
            ))}
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
              onSave={onSave}
            />
          ) : null}
        </AppPanel>
      ) : null}
    </section>
  )
}
