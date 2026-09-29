import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { abonosApi } from '../api/abonos'
import { attendanceApi } from '../api/attendance'
import { resolveFileUrl } from '../api/baseUrl'
import { buildEventListQuery, defaultEventDateRange, endOfMonthDate, eventsApi } from '../api/events'
import { getApiErrorMessage } from '../api/client'
import { serviciosApi } from '../api/servicios'
import type {
  AttendanceEstado,
  AttendanceMember,
  ClubServicio,
  EventParticipant,
  EventParticipantService,
  EventSummary,
  EventTipo,
} from '../api/types'
import { AdminIcon } from '../admin/AdminIcon'
import {
  canAccessClubAbonos,
  canAccessClubAttendance,
  canCreateClubEvent,
  canJoinClubEconomicEvent,
  canManageClubServices,
  canUpdateClubEvent,
} from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import { EventBoard } from '../components/events/EventBoard'
import { ESTADO_LABELS, EVENT_ESTADO_OPTIONS, isActivityEvent, isEconomicEvent, isEconomicParticipationLocked } from '../components/events/EventCard'
import { EventMemberJoin } from '../components/events/EventMemberJoin'
import { EventServicesField } from '../components/events/EventServicesField'
import { AbonoPayForm, composeAbonoNota, emptyAbonoPayDraft } from '../components/abonos/AbonoPayForm'
import {
  emptyParticipantsDraft,
  participantsPayloadFromDraft,
  ParticipantsMarkList,
  saleTotals,
  type ParticipantDraft,
} from '../components/events/ParticipantsMarkList'
import { EventSubeventsPanel } from '../components/events/EventSubeventsPanel'
import { EventTabs, type EventWorkspaceTab } from '../components/events/EventTabs'
import { EventsFilters } from '../components/events/EventsFilters'
import { EventsViewToggle } from '../components/events/EventsViewToggle'
import { useNow } from '../components/events/EventCountdown'
import {
  AttendanceMarkList,
  attendancePayloadFromDraft,
  emptyAttendanceDraft,
  memberInitials,
} from '../components/attendance/AttendanceMarkList'
import { AppPanel } from '../theme/AppPanel'
import { DateInput } from '../theme/DateInput'
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
  estado: 'publicado',
  logo: null as File | null,
  banner: null as File | null,
  removeLogo: false,
  removeBanner: false,
})

function toDateInput(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function formatPrice(value: number | string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
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
    estado: item.estado && item.estado in ESTADO_LABELS ? item.estado : 'publicado',
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
  const dateRange = defaultEventDateRange()
  const estado = params.get('estado') ?? ''
  const tipo = params.get('tipo') ?? ''
  const desde = params.get('desde') ?? dateRange.desde
  const hasta = params.get('hasta') ?? dateRange.hasta
  const eventQuery = view === 'cronograma' ? {} : buildEventListQuery({ estado, tipo, desde, hasta })
  const hasListFilters =
    view === 'cuadricula' &&
    (Boolean(estado || tipo) || desde !== dateRange.desde || hasta !== dateRange.hasta)
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
  const canJoinEconomic = canJoinClubEconomicEvent({
    organizacionId: ctx?.organizacion_id,
    personaId: auth.user?.persona_id,
  })
  const canAbonar =
    canAccessClubAbonos({
      rolName: ctx?.rol_name,
      organizacionId: ctx?.organizacion_id,
    }) || auth.can('abonos.update')
  const canCreateServices = canManageClubServices({
    can: auth.can,
    rolName: ctx?.rol_name,
    organizacionId: ctx?.organizacion_id,
  })
  const [events, setEvents] = useState<EventSummary[]>([])
  const [tipos, setTipos] = useState<EventTipo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<EventSummary | null>(null)
  const [attendanceFor, setAttendanceFor] = useState<EventSummary | null>(null)
  const [participantsFor, setParticipantsFor] = useState<EventSummary | null>(null)
  const [joinFor, setJoinFor] = useState<EventSummary | null>(null)
  const [members, setMembers] = useState<AttendanceMember[]>([])
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [participantServices, setParticipantServices] = useState<EventParticipantService[]>([])
  const [draft, setDraft] = useState<Record<number, AttendanceEstado | ''>>({})
  const [participantDraft, setParticipantDraft] = useState<ParticipantDraft>({})
  const [serviceCatalog, setServiceCatalog] = useState<ClubServicio[]>([])
  const [serviceIds, setServiceIds] = useState<number[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [savingParticipants, setSavingParticipants] = useState(false)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [abonoForId, setAbonoForId] = useState<number | null>(null)
  const [abonoDraft, setAbonoDraft] = useState(emptyAbonoPayDraft)
  const [submitting, setSubmitting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(hasListFilters)
  const [form, setForm] = useState(emptyForm)
  const [eventTab, setEventTab] = useState<EventWorkspaceTab>('ficha')
  const notices = useNotice()
  const now = useNow()
  const draftRef = useRef(draft)
  const participantDraftRef = useRef(participantDraft)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const participantSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveSeq = useRef(0)
  const participantSaveSeq = useRef(0)
  draftRef.current = draft
  participantDraftRef.current = participantDraft
  const selectedTipo = tipos.find((item) => String(item.id) === form.tipo_evento_id)
  const formIsEconomic = isEconomicEvent(selectedTipo)

  async function loadEvents() {
    const next = await eventsApi.list(eventQuery)
    setEvents(next)
  }

  function patchParams(patch: Record<string, string | null>) {
    const nextParams = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) nextParams.set(key, value)
      else nextParams.delete(key)
    }
    setParams(nextParams, { replace: true })
  }

  function setView(next: 'cuadricula' | 'cronograma') {
    patchParams({ vista: next === 'cuadricula' ? null : 'cronograma' })
  }

  function setFilter(key: 'estado' | 'tipo' | 'desde' | 'hasta', value: string) {
    const next: Record<string, string | null> = { [key]: value || null }
    if (key === 'desde') {
      next.desde = value || dateRange.desde
      next.hasta = endOfMonthDate(next.desde)
    }
    if (key === 'hasta') next.hasta = value || endOfMonthDate(desde)
    patchParams(next)
  }

  useEffect(() => {
    let cancelled = false
    eventsApi
      .tipos()
      .then((nextTipos) => {
        if (!cancelled) setTipos(nextTipos)
      })
      .catch(() => {
        if (!cancelled) setTipos([])
      })
    return () => {
      cancelled = true
    }
  }, [ctx?.organizacion_id])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    eventsApi
      .list(eventQuery)
      .then((nextEvents) => {
        if (!cancelled) setEvents(nextEvents)
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
  }, [view, estado, tipo, desde, hasta, ctx?.organizacion_id, notices])

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setEventTab('ficha')
    setForm(emptyForm())
    setServiceIds([])
    setServiceCatalog([])
  }

  function openCreate() {
    closeAttendance()
    closeParticipants()
    closeJoin()
    setEditing(null)
    setEventTab('ficha')
    setForm(emptyForm())
    setServiceIds([])
    setShowForm(true)
  }

  function openEdit(item: EventSummary) {
    if (!canEditEvents) return
    setAttendanceFor(null)
    setParticipantsFor(null)
    setJoinFor(null)
    setEditing(item)
    setEventTab('ficha')
    setForm(formFromEvent(item))
    setShowForm(true)
  }

  function openJoin(item: EventSummary) {
    if (!canJoinEconomic || !isEconomicEvent(item)) return
    closeForm()
    closeAttendance()
    closeParticipants()
    setJoinFor(item)
  }

  function closeJoin() {
    setJoinFor(null)
  }

  function openAttendance(item: EventSummary) {
    if (!canTakeAttendance) return
    if (isEconomicEvent(item)) {
      closeForm()
      closeAttendance()
      closeJoin()
      setParticipantsFor(item)
      return
    }
    if (!isActivityEvent(item)) return
    closeForm()
    closeParticipants()
    closeJoin()
    setAttendanceFor(item)
  }

  function closeAttendance() {
    setAttendanceFor(null)
    setMembers([])
    setDraft({})
  }

  function closeParticipants() {
    setParticipantsFor(null)
    setParticipants([])
    setParticipantDraft({})
    setPayingId(null)
    closeParticipantAbono()
  }

  function closeParticipantAbono() {
    setAbonoForId(null)
    setAbonoDraft(emptyAbonoPayDraft())
  }

  useEffect(() => {
    if (!showForm || !formIsEconomic) {
      if (!formIsEconomic) setServiceIds([])
      return undefined
    }
    let cancelled = false
    setLoadingServices(true)
    const offers = editing ? serviciosApi.eventOffers(editing.id) : Promise.resolve(null)
    Promise.all([serviciosApi.list({ activos: true }), offers])
      .then(([catalog, eventServices]) => {
        if (cancelled) return
        setServiceCatalog(catalog)
        if (eventServices) {
          setServiceIds(eventServices.ofertas.map((oferta) => oferta.producto_servicio_id))
        }
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar los servicios'))
      })
      .finally(() => {
        if (!cancelled) setLoadingServices(false)
      })
    return () => {
      cancelled = true
    }
  }, [showForm, formIsEconomic, editing, notices])

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
    if (!participantsFor) return undefined
    let cancelled = false
    setLoadingParticipants(true)
    serviciosApi
      .participants(participantsFor.id)
      .then((next) => {
        if (cancelled) return
        setParticipants(next.integrantes)
        setParticipantServices(next.servicios ?? [])
        const nextDraft = emptyParticipantsDraft(next.integrantes)
        participantDraftRef.current = nextDraft
        setParticipantDraft(nextDraft)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar los participantes'))
      })
      .finally(() => {
        if (!cancelled) setLoadingParticipants(false)
      })
    return () => {
      cancelled = true
    }
  }, [participantsFor, notices])

  function setParticipa(personaId: number, participa: boolean | '') {
    const current = participantDraftRef.current[personaId] ?? { participa: '' as const, ventas: {} }
    const next = {
      ...participantDraftRef.current,
      [personaId]: { ...current, participa },
    }
    participantDraftRef.current = next
    setParticipantDraft(next)
    queueParticipantSave(next)
  }

  function setParticipantQty(personaId: number, productoServicioId: number, cantidad: number) {
    const current = participantDraftRef.current[personaId] ?? { participa: true as const, ventas: {} }
    const qty = Number.isFinite(cantidad) ? Math.max(0, Math.floor(cantidad)) : 0
    const next = {
      ...participantDraftRef.current,
      [personaId]: {
        ...current,
        participa: current.participa === true ? true : current.participa,
        ventas: { ...current.ventas, [productoServicioId]: qty },
      },
    }
    participantDraftRef.current = next
    setParticipantDraft(next)
    queueParticipantSave(next)
  }

  function markAllParticipants(participa: boolean | '') {
    const next = Object.fromEntries(
      participants.map((row) => {
        const current = participantDraftRef.current[row.persona_id] ?? { participa: '' as const, ventas: {} }
        return [row.persona_id, { ...current, participa, ventas: participa === true ? current.ventas : {} }]
      }),
    )
    participantDraftRef.current = next
    setParticipantDraft(next)
    queueParticipantSave(next)
  }

  function queueParticipantSave(nextDraft: ParticipantDraft) {
    if (!participantsFor || !canTakeAttendance) return
    const id = participantsFor.id
    setSavingParticipants(true)
    if (participantSaveTimer.current) clearTimeout(participantSaveTimer.current)
    participantSaveTimer.current = setTimeout(() => {
      participantSaveTimer.current = null
      void persistParticipants(id, nextDraft)
    }, 220)
  }

  async function persistParticipants(id: number, nextDraft: ParticipantDraft) {
    if (!canTakeAttendance) return
    const seq = ++participantSaveSeq.current
    setSavingParticipants(true)
    try {
      const next = await serviciosApi.saveParticipants(id, participantsPayloadFromDraft(nextDraft))
      if (seq !== participantSaveSeq.current) return
      setParticipants((current) =>
        next.integrantes.map((row) => {
          const prev = current.find((item) => item.persona_id === row.persona_id)
          const prevAbonado = Number(prev?.abonado) || 0
          const nextAbonado = Number(row.abonado) || 0
          if (prev && prevAbonado > nextAbonado) {
            return { ...row, abonado: prev.abonado, abonos: prev.abonos }
          }
          return row
        }),
      )
      setParticipantServices(next.servicios ?? [])
      const saved = emptyParticipantsDraft(next.integrantes)
      participantDraftRef.current = saved
      setParticipantDraft(saved)
    } catch (err) {
      if (seq !== participantSaveSeq.current) return
      notices.error(getApiErrorMessage(err, 'No se pudieron guardar los participantes'))
    } finally {
      if (seq === participantSaveSeq.current) setSavingParticipants(false)
    }
  }

  function openParticipantAbono(personaId: number) {
    const row = participants.find((item) => item.persona_id === personaId)
    if (!row) return
    const ventas = participantDraft[personaId]?.ventas ?? {}
    const pendiente = saleTotals(participantServices, ventas).recaudo - (Number(row.abonado) || 0)
    setAbonoForId(personaId)
    setAbonoDraft({
      ...emptyAbonoPayDraft(),
      monto: pendiente > 0 ? String(Math.round(pendiente)) : '',
    })
  }

  async function submitParticipantAbono(event?: FormEvent) {
    event?.preventDefault()
    if (!participantsFor || !canAbonar || !abonoForId) return
    const monto = Number(abonoDraft.monto)
    if (!abonoDraft.metodo) {
      notices.warning('Elige un método de pago.')
      return
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      notices.warning('Escribe un monto mayor a cero.')
      return
    }
    setPayingId(abonoForId)
    try {
      const next = await abonosApi.store({
        evento_id: participantsFor.id,
        persona_id: abonoForId,
        monto,
        nota: composeAbonoNota(abonoDraft),
        modo: 'actividad',
      })
      setParticipants((current) =>
        current.map((row) => {
          const fila = next.filas.find((item) => item.persona_id === row.persona_id)
          if (!fila) return row
          return {
            ...row,
            abonado: fila.abonado,
            abonos: fila.abonos ?? row.abonos,
          }
        }),
      )
      notices.success('Abono registrado.')
      closeParticipantAbono()
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo registrar el abono'))
    } finally {
      setPayingId(null)
    }
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (participantSaveTimer.current) clearTimeout(participantSaveTimer.current)
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
      estado: form.estado,
      logo: form.logo,
      banner: form.banner,
      remove_logo: form.removeLogo,
      remove_banner: form.removeBanner,
    }
    try {
      const saved = editing
        ? await eventsApi.update(editing.id, payload)
        : await eventsApi.create(payload)
      if (formIsEconomic) {
        await serviciosApi.syncEventOffers(saved.id, serviceIds)
      }
      notices.success(editing ? 'Evento actualizado.' : 'Evento creado.')
      closeForm()
      await loadEvents()
    } catch (err) {
      notices.error(getApiErrorMessage(err, editing ? 'No se pudo actualizar el evento' : 'No se pudo crear el evento'))
    } finally {
      setSubmitting(false)
    }
  }

  const abonoFor = participants.find((row) => row.persona_id === abonoForId) ?? null
  const abonoMoney = abonoFor
    ? saleTotals(participantServices, participantDraft[abonoFor.persona_id]?.ventas ?? {})
    : { unidades: 0, recaudo: 0 }
  const abonoAbonado = Number(abonoFor?.abonado) || 0
  const abonoPendiente = abonoMoney.recaudo - abonoAbonado

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
        subtitle={
          editing
            ? 'Actualiza la información. Los cambios se guardan al finalizar.'
            : 'Completa la ficha. Se guardará al finalizar.'
        }
        onClose={closeForm}
        footer={
          !editing || eventTab === 'ficha' ? (
            <>
              <button type="button" className="app-panel__btn--ghost" onClick={closeForm}>
                Cancelar
              </button>
              <button type="submit" form="event-form" className="app-panel__btn--primary" disabled={submitting}>
                {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar evento'}
              </button>
            </>
          ) : null
        }
      >
        {editing ? <EventTabs tab={eventTab} onChange={setEventTab} /> : null}
        {editing && eventTab === 'subeventos' ? (
          <EventSubeventsPanel parent={editing} tipos={tipos} canCreate={canCreate} />
        ) : (
        <form id="event-form" className="admin-form event-form" onSubmit={onSave}>
          <section className="event-form__section">
            <h3>
              <AdminIcon name="eye" />
              Banner
            </h3>
            <ImageUpload
              label="Banner"
              hint="Recomendado 1600 × 500 px. JPG, PNG o WebP."
              actionLabel="Cambiar banner"
              variant="banner"
              file={form.banner}
              previewUrl={form.removeBanner ? null : resolveFileUrl(editing?.banner_url)}
              emptyText="Sin banner"
              onSelect={(next) => setForm((current) => ({ ...current, banner: next, removeBanner: false }))}
              onClear={() => setForm((current) => ({ ...current, banner: null, removeBanner: true }))}
            />
          </section>

          <section className="event-form__section">
            <h3>
              <AdminIcon name="user" />
              Identidad
            </h3>
            <div className="event-form__identity">
              <div className="event-form__photo">
                <ImageUpload
                  label="Foto"
                  hint="Cambiar foto"
                  actionLabel="Cambiar foto"
                  variant="logo"
                  file={form.logo}
                  previewUrl={form.removeLogo ? null : resolveFileUrl(editing?.image_url)}
                  emptyText="Sin foto"
                  onSelect={(next) => setForm((current) => ({ ...current, logo: next, removeLogo: false }))}
                  onClear={() => setForm((current) => ({ ...current, logo: null, removeLogo: true }))}
                />
              </div>
              <label>
                Nombre de la actividad
                <input
                  value={form.name}
                  required
                  maxLength={255}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
                <small>{form.name.length}/255</small>
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
            </div>
          </section>

          <section className="event-form__section">
            <h3>
              <AdminIcon name="idCard" />
              Información
            </h3>
            <div className="event-form__field">
              <label htmlFor="event-descripcion">
                Descripción
                <small>{form.descripcion.length}/500</small>
              </label>
              <textarea
                id="event-descripcion"
                name="descripcion"
                value={form.descripcion}
                rows={3}
                maxLength={500}
                placeholder="Objetivo, recomendaciones o información adicional."
                onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
              />
            </div>
            <div className="event-form__pair">
              <label>
                Lugar
                <input
                  value={form.lugar}
                  maxLength={255}
                  onChange={(event) => setForm((current) => ({ ...current, lugar: event.target.value }))}
                />
              </label>
              <label>
                Estado
                <select
                  value={form.estado}
                  onChange={(event) => setForm((current) => ({ ...current, estado: event.target.value }))}
                >
                  {EVENT_ESTADO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {formIsEconomic ? (
            <section className="event-form__section">
              <h3>
                <AdminIcon name="box" />
                Servicios del club
              </h3>
              <EventServicesField
                catalog={serviceCatalog}
                selectedIds={serviceIds}
                loading={loadingServices}
                canCreate={canCreateServices}
                hideLegend
                onChange={setServiceIds}
                onCreated={(service) =>
                  setServiceCatalog((current) =>
                    current.some((item) => item.id === service.id) ? current : [...current, service],
                  )
                }
              />
            </section>
          ) : null}

          <section className="event-form__section">
            <h3>
              <AdminIcon name="calendar" />
              Fechas
            </h3>
            <div className="event-form__pair">
              <label>
                Fecha de inicio
                <DateInput
                  required
                  value={form.starts_at}
                  onChange={(starts_at) =>
                    setForm((current) => ({
                      ...current,
                      starts_at,
                      ends_at: current.ends_at < starts_at ? starts_at : current.ends_at,
                    }))
                  }
                />
              </label>
              <label>
                Fecha de fin
                <DateInput
                  required
                  min={form.starts_at}
                  value={form.ends_at}
                  onChange={(ends_at) => setForm((current) => ({ ...current, ends_at }))}
                />
              </label>
            </div>
          </section>
        </form>
        )}
      </CreateDrawer>

      <CreateDrawer
        open={Boolean(participantsFor)}
        placement="bottom"
        title={participantsFor?.name || 'Participantes'}
        onClose={closeParticipants}
      >
        {loadingParticipants ? <p className="app-panel__muted">Cargando integrantes…</p> : null}
        {!loadingParticipants && participants.length === 0 ? (
          <p className="app-panel__muted">Este club todavía no tiene integrantes para marcar participantes.</p>
        ) : null}
        {!loadingParticipants && participants.length ? (
          <ParticipantsMarkList
            members={participants}
            services={participantServices}
            draft={participantDraft}
            canEdit={canTakeAttendance && !isEconomicParticipationLocked(participantsFor)}
            canAbonar={canAbonar}
            participationLocked={isEconomicParticipationLocked(participantsFor)}
            saving={savingParticipants}
            payingId={payingId}
            onChange={setParticipa}
            onQty={setParticipantQty}
            onMarkAll={markAllParticipants}
            onStartAbono={openParticipantAbono}
          />
        ) : null}
      </CreateDrawer>

      <CreateDrawer
        open={Boolean(abonoFor)}
        stacked
        placement="bottom"
        title={abonoFor?.full_name || 'Registrar abono'}
        subtitle="Recaudo"
        avatar={resolveFileUrl(abonoFor?.foto_url)}
        avatarFallback={abonoFor ? memberInitials(abonoFor.full_name) : 'AB'}
        onClose={closeParticipantAbono}
        footer={
          <>
            <button type="button" className="app-panel__btn--ghost" onClick={closeParticipantAbono}>
              Cancelar
            </button>
            <button
              type="button"
              className="app-panel__btn--primary"
              disabled={payingId === abonoFor?.persona_id || abonoPendiente <= 0}
              onClick={() => void submitParticipantAbono()}
            >
              <AdminIcon name="wallet" />
              Registrar abono
            </button>
          </>
        }
      >
        {abonoFor ? (
          <div className="abonos-detail">
            <div className="abonos-deal__money">
              <p className="event-countdown__cell">
                <strong>{formatPrice(abonoMoney.recaudo)}</strong>
                <span>Comprometido</span>
              </p>
              <p className="event-countdown__cell">
                <strong>{formatPrice(abonoAbonado)}</strong>
                <span>Abonado</span>
              </p>
              <p className="event-countdown__cell">
                <strong>{formatPrice(abonoPendiente)}</strong>
                <span>Pendiente</span>
              </p>
            </div>
            <AbonoPayForm
              id="participant-abono-form"
              draft={abonoDraft}
              pendiente={abonoPendiente}
              saving={payingId === abonoFor.persona_id}
              showSubmit={false}
              onChange={setAbonoDraft}
              onSubmit={(event) => void submitParticipantAbono(event)}
            />
          </div>
        ) : null}
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

      {joinFor ? <EventMemberJoin event={joinFor} onClose={closeJoin} /> : null}

      <div className="admin-events__toolbar">
        <EventsViewToggle
          view={view}
          filtersOpen={filtersOpen}
          onChange={setView}
          onToggleFilters={() => setFiltersOpen((open) => !open)}
        >
          {filtersOpen ? (
            <EventsFilters
              estado={estado}
              tipo={tipo}
              tipos={tipos}
              desde={desde}
              hasta={hasta}
              onEstado={(value) => setFilter('estado', value)}
              onTipo={(value) => setFilter('tipo', value)}
              onDesde={(value) => setFilter('desde', value)}
              onHasta={(value) => setFilter('hasta', value)}
            />
          ) : null}
        </EventsViewToggle>
      </div>

      {loading ? <p className="admin-empty">Cargando eventos…</p> : null}

      {!loading && events.length === 0 ? (
        <AppPanel className="admin-events__empty" narrow>
          <p className="app-panel__kicker">Agenda</p>
          <h2 className="app-panel__title">No hay eventos</h2>
          <p className="app-panel__subtitle">
            {hasListFilters
              ? 'Prueba otro estado, tipo o rango de fechas.'
              : canCreate
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
          canJoin={canJoinEconomic}
          canCreate={canEditEvents}
          tipos={tipos}
          organizacionId={ctx?.organizacion_id}
          onAttendance={openAttendance}
          onJoin={openJoin}
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
              canJoin={canJoinEconomic}
              canEdit={canEditEvents && item.organizacion?.id === ctx?.organizacion_id}
              canManageSubevents={canEditEvents && item.organizacion?.id === ctx?.organizacion_id}
              onAttendance={openAttendance}
              onJoin={openJoin}
              onEdit={openEdit}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
