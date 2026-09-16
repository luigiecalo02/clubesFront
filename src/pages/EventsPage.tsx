import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { attendanceApi } from '../api/attendance'
import { resolveFileUrl } from '../api/baseUrl'
import { eventsApi } from '../api/events'
import { getApiErrorMessage } from '../api/client'
import type { AttendanceEstado, AttendanceMember, EventSummary, EventTipo } from '../api/types'
import { canAccessClubAttendance, canCreateClubEvent, canUpdateClubEvent } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import { EventBoard } from '../components/events/EventBoard'
import { isActivityEvent } from '../components/events/EventCard'
import { EventSubeventsPanel } from '../components/events/EventSubeventsPanel'
import { EventTabs, type EventWorkspaceTab } from '../components/events/EventTabs'
import { EventsViewToggle } from '../components/events/EventsViewToggle'
import { useNow } from '../components/events/EventCountdown'
import {
  AttendanceMarkList,
  attendancePayloadFromDraft,
  emptyAttendanceDraft,
} from '../components/attendance/AttendanceMarkList'
import { AppPanel } from '../theme/AppPanel'
import { useNotice } from '../theme/NoticeProvider'
import { CreateDrawer } from '../theme/CreateDrawer'
import { ImageUpload } from '../theme/ImageUpload'
import { EventsCalendar } from './CalendarPage'

const emptyForm = () => ({
  name: '',
  descripcion: '',
  lugar: '',
  starts_at: defaultStart(),
  ends_at: defaultStart(),
  tipo_evento_id: '',
  logo: null as File | null,
  banner: null as File | null,
  removeLogo: false,
  removeBanner: false,
})

function toDateInput(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function defaultStart(): string {
  const next = new Date()
  next.setDate(next.getDate() + 7)
  return toDateInput(next)
}

function toIsoFromDate(value: string, endOfDay = false): string {
  return new Date(`${value}${endOfDay ? 'T23:59:00' : 'T00:00:00'}`).toISOString()
}

function dateFromApi(value?: string | null): string {
  if (!value) return defaultStart()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return defaultStart()
  return toDateInput(parsed)
}

function formFromEvent(item: EventSummary) {
  return {
    name: item.name,
    descripcion: item.descripcion ?? '',
    lugar: item.lugar ?? '',
    starts_at: dateFromApi(item.starts_at),
    ends_at: dateFromApi(item.ends_at),
    tipo_evento_id: item.tipo_evento?.id ? String(item.tipo_evento.id) : '',
    logo: null as File | null,
    banner: null as File | null,
    removeLogo: false,
    removeBanner: false,
  }
}

export function EventsPage() {
  const auth = useAuth()
  const ctx = auth.user?.contexto
  const [params, setParams] = useSearchParams()
  const view = params.get('vista') === 'cronograma' ? 'cronograma' : 'cuadricula'
  const eventAccess = {
    can: auth.can,
    rolName: ctx?.rol_name,
    organizacionId: ctx?.organizacion_id,
  }
  const canCreate = canCreateClubEvent(eventAccess)
  const canEditEvents = canUpdateClubEvent(eventAccess)
  const canTakeAttendance =
    canAccessClubAttendance({
      rolName: ctx?.rol_name,
      organizacionId: ctx?.organizacion_id,
    }) || auth.can('asistencia.update')
  const [events, setEvents] = useState<EventSummary[]>([])
  const [tipos, setTipos] = useState<EventTipo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<EventSummary | null>(null)
  const [attendanceFor, setAttendanceFor] = useState<EventSummary | null>(null)
  const [members, setMembers] = useState<AttendanceMember[]>([])
  const [draft, setDraft] = useState<Record<number, AttendanceEstado | ''>>({})
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [eventTab, setEventTab] = useState<EventWorkspaceTab>('ficha')
  const notices = useNotice()
  const now = useNow()
  const draftRef = useRef(draft)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveSeq = useRef(0)
  draftRef.current = draft

  async function loadEvents() {
    const next = await eventsApi.list()
    setEvents(next)
  }

  function setView(next: 'cuadricula' | 'cronograma') {
    const nextParams = new URLSearchParams(params)
    if (next === 'cuadricula') nextParams.delete('vista')
    else nextParams.set('vista', 'cronograma')
    setParams(nextParams, { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([eventsApi.list(), canCreate ? eventsApi.tipos().catch(() => []) : Promise.resolve([])])
      .then(([nextEvents, nextTipos]) => {
        if (cancelled) return
        setEvents(nextEvents)
        setTipos(nextTipos)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar los eventos'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canCreate, ctx?.organizacion_id, notices])

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setEventTab('ficha')
    setForm(emptyForm())
  }

  function openCreate() {
    closeAttendance()
    setEditing(null)
    setEventTab('ficha')
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(item: EventSummary) {
    if (!canEditEvents) return
    setAttendanceFor(null)
    setEditing(item)
    setEventTab('ficha')
    setForm(formFromEvent(item))
    setShowForm(true)
  }

  function openAttendance(item: EventSummary) {
    if (!canTakeAttendance || !isActivityEvent(item)) return
    closeForm()
    setAttendanceFor(item)
  }

  function closeAttendance() {
    setAttendanceFor(null)
    setMembers([])
    setDraft({})
  }

  useEffect(() => {
    if (!attendanceFor) return undefined
    let cancelled = false
    setLoadingRoster(true)
    attendanceApi
      .roster(attendanceFor.id)
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
  }, [attendanceFor, notices])

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
    if (!attendanceFor || !canTakeAttendance) return
    const id = attendanceFor.id
    setSavingAttendance(true)
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
    if (!canTakeAttendance) return
    const seq = ++saveSeq.current
    setSavingAttendance(true)
    try {
      const { presentes, puntuales, justificados } = attendancePayloadFromDraft(members, nextDraft)
      const next = await attendanceApi.save(id, presentes, justificados, puntuales)
      if (seq !== saveSeq.current) return
      setMembers(next.integrantes)
      const saved = emptyAttendanceDraft(next.integrantes)
      draftRef.current = saved
      setDraft(saved)
    } catch (err) {
      if (seq !== saveSeq.current) return
      notices.error(getApiErrorMessage(err, 'No se pudo guardar la asistencia'))
    } finally {
      if (seq === saveSeq.current) setSavingAttendance(false)
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!canCreate && !canEditEvents) return
    setSubmitting(true)
    const payload = {
      name: form.name.trim(),
      descripcion: form.descripcion.trim() || undefined,
      lugar: form.lugar.trim() || undefined,
      starts_at: toIsoFromDate(form.starts_at),
      ends_at: toIsoFromDate(form.ends_at, true),
      tipo_evento_id: form.tipo_evento_id ? Number(form.tipo_evento_id) : undefined,
      logo: form.logo,
      banner: form.banner,
      remove_logo: form.removeLogo,
      remove_banner: form.removeBanner,
    }
    try {
      if (editing) {
        await eventsApi.update(editing.id, payload)
        notices.success('Evento actualizado.')
      } else {
        await eventsApi.create(payload)
        notices.success('Evento creado.')
      }
      closeForm()
      await loadEvents()
    } catch (err) {
      notices.error(getApiErrorMessage(err, editing ? 'No se pudo actualizar el evento' : 'No se pudo crear el evento'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="admin-page admin-page--events">
      {canCreate ? (
        <button
          type="button"
          className={`admin-fab${showForm ? ' is-open' : ''}`}
          aria-label={showForm ? 'Cerrar formulario' : 'Crear evento'}
          title={showForm ? 'Cerrar formulario' : 'Crear evento'}
          onClick={() => (showForm ? closeForm() : openCreate())}
        >
          <span aria-hidden="true">+</span>
        </button>
      ) : null}

      <CreateDrawer
        open={showForm}
        title={editing ? 'Editar evento' : 'Crear evento'}
        onClose={closeForm}
        footer={
          !editing || eventTab === 'ficha' ? (
            <button type="submit" form="event-form" className="app-panel__btn--primary" disabled={submitting}>
              {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar evento'}
            </button>
          ) : null
        }
      >
        {editing ? <EventTabs tab={eventTab} onChange={setEventTab} /> : null}
        {editing && eventTab === 'subeventos' ? (
          <EventSubeventsPanel parent={editing} tipos={tipos} canCreate={canCreate} />
        ) : (
        <form id="event-form" className="admin-form" onSubmit={onSave}>
          <label>
            Nombre
            <input
              value={form.name}
              required
              maxLength={255}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          <div className="admin-assets">
            <ImageUpload
              label="Logo"
              hint="Emblema del evento. JPG, PNG o WebP."
              variant="logo"
              file={form.logo}
              previewUrl={form.removeLogo ? null : resolveFileUrl(editing?.image_url)}
              emptyText="Sin logo"
              onSelect={(next) => setForm((current) => ({ ...current, logo: next, removeLogo: false }))}
              onClear={() => setForm((current) => ({ ...current, logo: null, removeLogo: true }))}
            />
            <ImageUpload
              label="Banner"
              hint="Imagen de portada. JPG, PNG o WebP."
              variant="banner"
              file={form.banner}
              previewUrl={form.removeBanner ? null : resolveFileUrl(editing?.banner_url)}
              emptyText="Sin banner"
              onSelect={(next) => setForm((current) => ({ ...current, banner: next, removeBanner: false }))}
              onClear={() => setForm((current) => ({ ...current, banner: null, removeBanner: true }))}
            />
          </div>

          <label>
            Descripción
            <textarea
              value={form.descripcion}
              rows={3}
              onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
            />
          </label>
          <label>
            Lugar
            <input
              value={form.lugar}
              maxLength={255}
              onChange={(event) => setForm((current) => ({ ...current, lugar: event.target.value }))}
            />
          </label>
          {tipos.length ? (
            <label>
              Tipo
              <select
                value={form.tipo_evento_id}
                onChange={(event) => setForm((current) => ({ ...current, tipo_evento_id: event.target.value }))}
              >
                <option value="">Sin tipo</option>
                {tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Fecha de inicio
            <input
              type="date"
              required
              value={form.starts_at}
              onChange={(event) => {
                const starts_at = event.target.value
                setForm((current) => ({
                  ...current,
                  starts_at,
                  ends_at: current.ends_at < starts_at ? starts_at : current.ends_at,
                }))
              }}
            />
          </label>
          <label>
            Fecha de fin
            <input
              type="date"
              required
              min={form.starts_at}
              value={form.ends_at}
              onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
            />
          </label>
        </form>
        )}
      </CreateDrawer>

      <CreateDrawer
        open={Boolean(attendanceFor)}
        title={attendanceFor?.name || 'Tomar asistencia'}
        onClose={closeAttendance}
      >
        {loadingRoster ? <p className="app-panel__muted">Cargando integrantes…</p> : null}
        {!loadingRoster && members.length === 0 ? (
          <p className="app-panel__muted">Este club todavía no tiene integrantes para marcar asistencia.</p>
        ) : null}
        {!loadingRoster && members.length ? (
          <AttendanceMarkList
            members={members}
            draft={draft}
            canEdit={canTakeAttendance}
            saving={savingAttendance}
            onEstado={setEstado}
            onMarkAll={markAll}
          />
        ) : null}
      </CreateDrawer>

      <EventsViewToggle view={view} onChange={setView} />

      {loading ? <p className="admin-empty">Cargando eventos…</p> : null}

      {!loading && events.length === 0 ? (
        <AppPanel className="admin-events__empty" narrow>
          <p className="app-panel__kicker">Agenda</p>
          <h2 className="app-panel__title">No hay eventos</h2>
          <p className="app-panel__subtitle">
            {canCreate
              ? 'Crea el primero para tu club.'
              : 'Cuando haya actividades vigentes aparecerán aquí.'}
          </p>
        </AppPanel>
      ) : null}

      {view === 'cronograma' && events.length ? (
        <EventsCalendar
          events={events}
          loading={loading}
          now={now}
          canTakeAttendance={canTakeAttendance}
          canCreate={canEditEvents}
          tipos={tipos}
          organizacionId={ctx?.organizacion_id}
          onAttendance={openAttendance}
          onEdit={openEdit}
        />
      ) : null}

      {view === 'cuadricula' ? (
        <div className="admin-events">
          {events.map((item) => (
            <EventBoard
              key={item.id}
              item={item}
              now={now}
              tipos={tipos}
              canTakeAttendance={canTakeAttendance}
              canEdit={canEditEvents && item.organizacion?.id === ctx?.organizacion_id}
              canManageSubevents={canEditEvents && item.organizacion?.id === ctx?.organizacion_id}
              onAttendance={openAttendance}
              onEdit={openEdit}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
