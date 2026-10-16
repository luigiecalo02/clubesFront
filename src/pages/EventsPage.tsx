import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { abonosApi } from '../api/abonos'
import { attendanceApi } from '../api/attendance'
import { resolveFileUrl } from '../api/baseUrl'
import { buildEventListQuery, defaultEventDateRange, endOfMonthDate, eventsApi } from '../api/events'
import { getApiErrorMessage } from '../api/client'
import { serviciosApi } from '../api/servicios'
import { settingsApi } from '../api/settings'
import type {
  AttendanceEstado,
  AttendanceMember,
  ClubServicio,
  EventParticipant,
  EventParticipantService,
  EventoGananciaRegistro,
  EventoServicios,
  EventSummary,
  EventTipo,
} from '../api/types'
import { AdminIcon } from '../admin/AdminIcon'
import {
  canAccessClubAbonos,
  canAccessClubAttendance,
  canCreateClubEvent,
  canJoinClubEconomicEvent,
  canChangeClubEventGanancia,
  canViewClubEventGanancias,
  canJoinClubInscriptionEvent,
  canManageClubInscriptions,
  canManageClubServices,
  canUpdateClubEvent,
} from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import { EventBoard } from '../components/events/EventBoard'
import { ESTADO_LABELS, EVENT_ESTADO_OPTIONS, isActivityEvent, isEconomicEvent, isEconomicParticipationLocked, isInscribibleEvent, isInscriptionOpen } from '../components/events/EventCard'
import { EventInscriptionJoin } from '../components/events/EventInscriptionJoin'
import { EventInscriptionRoster } from '../components/events/EventInscriptionRoster'
import { EventMemberJoin } from '../components/events/EventMemberJoin'
import { EventServicesField } from '../components/events/EventServicesField'
import { AbonoPayForm, composeAbonoNota, emptyAbonoPayDraft } from '../components/abonos/AbonoPayForm'
import {
  emptyParticipantsDraft,
  participantsPayloadFromDraft,
  ParticipantEventStats,
  ParticipantsMarkList,
  PendingProofsPanel,
  pendingProofs,
  saleTotals,
  type ParticipantDraft,
} from '../components/events/ParticipantsMarkList'
import { EventActivitySummary } from '../components/events/EventActivitySummary'
import { EventGananciasPanel } from '../components/events/EventGananciasPanel'
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
import { AppTabs } from '../theme/AppTabs'
import { DateInput } from '../theme/DateInput'
import { useNotice } from '../theme/NoticeProvider'
import { CreateDrawer } from '../theme/CreateDrawer'
import { ImageUpload } from '../theme/ImageUpload'
import { EventsCalendar } from './CalendarPage'

const MOBILE_EVENTS = '(max-width: 900px)'

const emptyForm = () => ({
  name: '',
  descripcion: '',
  lugar: '',
  starts_at: defaultStart(),
  ends_at: defaultStart(),
  tipo_evento_id: '',
  estado: 'publicado',
  ganancia_eclesiastica_id: '',
  capital: '',
  logo: null as File | null,
  banner: null as File | null,
  removeLogo: false,
  removeBanner: false,
})

function toDateInput(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function moneyInput(value?: number | string | null): string {
  if (value == null || value === '') return ''
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return String(Math.round(amount))
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
    ganancia_eclesiastica_id: item.ganancia_eclesiastica_id ? String(item.ganancia_eclesiastica_id) : '',
    capital: moneyInput(item.capital),
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
  const canViewGanancias = canViewClubEventGanancias({
    rolName: ctx?.rol_name,
    organizacionId: ctx?.organizacion_id,
  })
  const canChangeGanancia = canChangeClubEventGanancia({
    rolName: ctx?.rol_name,
    isSuper: Boolean(auth.user?.is_super || auth.user?.roles?.includes('super_admin')),
  })
  const canTakeAttendance =
    canAccessClubAttendance({
      rolName: ctx?.rol_name,
      organizacionId: ctx?.organizacion_id,
    }) || auth.can('asistencia.update')
  const canJoinEconomic = canJoinClubEconomicEvent({
    organizacionId: ctx?.organizacion_id,
    personaId: auth.user?.persona_id,
  })
  const canJoinInscription = canJoinClubInscriptionEvent({
    organizacionId: ctx?.organizacion_id,
    personaId: auth.user?.persona_id,
  })
  const canManageInscriptions = canManageClubInscriptions(eventAccess)
  const canJoinEvent = canJoinEconomic || canJoinInscription
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
  const [participantTab, setParticipantTab] = useState<'participantes' | 'ganancias' | 'comprobantes'>('participantes')
  const [joinFor, setJoinFor] = useState<EventSummary | null>(null)
  const [inscriptionsFor, setInscriptionsFor] = useState<EventSummary | null>(null)
  const [members, setMembers] = useState<AttendanceMember[]>([])
  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [participantServices, setParticipantServices] = useState<EventParticipantService[]>([])
  const [draft, setDraft] = useState<Record<number, AttendanceEstado | ''>>({})
  const [participantDraft, setParticipantDraft] = useState<ParticipantDraft>({})
  const [serviceCatalog, setServiceCatalog] = useState<ClubServicio[]>([])
  const [serviceIds, setServiceIds] = useState<number[]>([])
  const [projectedQty, setProjectedQty] = useState<Record<number, string>>({})
  const [serviceInvestments, setServiceInvestments] = useState<Record<number, string>>({})
  const [servicePrices, setServicePrices] = useState<Record<number, string>>({})
  const [gainLines, setGainLines] = useState<Record<number, { total: number; gananciaUnidad: number }>>({})
  const [gainRecord, setGainRecord] = useState<EventoGananciaRegistro | null>(null)
  const [servicesLocked, setServicesLocked] = useState(false)
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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_EVENTS).matches : false,
  )
  const notices = useNotice()
  const drawerPlacement = isMobile ? 'bottom' : 'end'
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

  useEffect(() => {
    if ((!formIsEconomic || !canViewGanancias) && eventTab === 'ganancias') setEventTab('ficha')
  }, [canViewGanancias, eventTab, formIsEconomic])

  useEffect(() => {
    if (!canViewGanancias || !showForm || !formIsEconomic || form.ganancia_eclesiastica_id) return undefined
    let cancelled = false
    settingsApi
      .eclesiasticas()
      .then((items) => {
        if (cancelled || items.length === 0) return
        const preferred = items.find((item) => item.es_predeterminada) ?? items[0]
        setForm((current) =>
          current.ganancia_eclesiastica_id
            ? current
            : { ...current, ganancia_eclesiastica_id: String(preferred.id) },
        )
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [canViewGanancias, showForm, formIsEconomic, form.ganancia_eclesiastica_id])

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
    const media = window.matchMedia(MOBILE_EVENTS)
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

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
    setProjectedQty({})
    setServicePrices({})
    setGainLines({})
    setGainRecord(null)
    setServiceCatalog([])
  }

  function openCreate() {
    closeAttendance()
    closeParticipants()
    closeJoin()
    closeInscriptions()
    setEditing(null)
    setEventTab('ficha')
    setForm(emptyForm())
    setServiceIds([])
    setProjectedQty({})
    setServicePrices({})
    setShowForm(true)
  }

  function openEdit(item: EventSummary) {
    if (!canEditEvents) return
    setAttendanceFor(null)
    setParticipantsFor(null)
    setJoinFor(null)
    setInscriptionsFor(null)
    setEditing(item)
    setEventTab('ficha')
    setForm(formFromEvent(item))
    setShowForm(true)
  }

  async function changeEventEstado(item: EventSummary, estado: string) {
    try {
      patchEvent(await eventsApi.changeEstado(item.id, estado))
      notices.success('Estado actualizado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo cambiar el estado'))
      throw err
    }
  }

  function patchEvent(next: EventSummary) {
    setEvents((current) => current.map((item) => (item.id === next.id ? { ...item, ...next } : item)))
    setJoinFor((current) => (current?.id === next.id ? { ...current, ...next } : current))
    setInscriptionsFor((current) => (current?.id === next.id ? { ...current, ...next } : current))
  }

  function openJoin(item: EventSummary) {
    if (isEconomicEvent(item)) {
      if (!canJoinEconomic) return
      closeForm()
      closeAttendance()
      closeParticipants()
      setInscriptionsFor(null)
      setJoinFor(item)
      return
    }
    if (!canJoinInscription || !isInscribibleEvent(item) || !isInscriptionOpen(item)) return
    closeForm()
    closeAttendance()
    closeParticipants()
    setInscriptionsFor(null)
    setJoinFor(item)
  }

  function closeJoin() {
    setJoinFor(null)
  }

  function openInscriptions(item: EventSummary) {
    if (!canManageInscriptions || !isInscribibleEvent(item) || !isInscriptionOpen(item)) return
    closeForm()
    closeAttendance()
    closeParticipants()
    setJoinFor(null)
    setInscriptionsFor(item)
  }

  function closeInscriptions() {
    setInscriptionsFor(null)
  }

  function openAttendance(item: EventSummary) {
    if (!canTakeAttendance) return
    if (isEconomicEvent(item)) {
      closeForm()
      closeAttendance()
      closeJoin()
      setParticipantTab('participantes')
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
    setParticipantTab('participantes')
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
      if (!formIsEconomic) {
        setServiceIds([])
        setServicesLocked(false)
      }
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
          setProjectedQty(
            Object.fromEntries(
              eventServices.ofertas.map((oferta) => [
                oferta.producto_servicio_id,
                String(oferta.cantidad_proyectada ?? 0),
              ]),
            ),
          )
          setServiceInvestments(
            Object.fromEntries(
              eventServices.ofertas.map((oferta) => [
                oferta.producto_servicio_id,
                String(Math.round(Number(oferta.inversion) || 0) || ''),
              ]),
            ),
          )
          setServicePrices(
            Object.fromEntries(
              eventServices.ofertas.map((oferta) => [
                oferta.producto_servicio_id,
                String(Math.round(Number(oferta.precio) || 0)),
              ]),
            ),
          )
          applyGainSnapshot(eventServices)
          setServicesLocked(Boolean(eventServices.evento.tiene_abonos))
        } else {
          setServiceInvestments({})
          setServicePrices({})
          setGainLines({})
          setGainRecord(null)
          setServicesLocked(false)
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

  function applyGainSnapshot(payload: EventoServicios) {
    const registro = payload.evento.ganancia_registro ?? null
    setGainRecord(registro)
    setGainLines(
      Object.fromEntries(
        payload.ofertas.map((oferta) => [
          oferta.producto_servicio_id,
          {
            total: Number(oferta.total) || 0,
            gananciaUnidad: Number(oferta.ganancia_unidad) || 0,
          },
        ]),
      ),
    )
    if (!registro || !editing) return
    setEvents((current) =>
      current.map((item) =>
        item.id === editing.id ? { ...item, ganancia_registro: registro, capital: registro.capital } : item,
      ),
    )
    setParticipantsFor((current) =>
      current && current.id === editing.id
        ? { ...current, ganancia_registro: registro, capital: registro.capital }
        : current,
    )
  }

  useEffect(() => {
    if (!showForm || !editing || !formIsEconomic || loadingServices) return undefined
    const eventId = editing.id
    const timer = window.setTimeout(() => {
      const proyecciones = serviceIds.map((id) => ({
        producto_servicio_id: id,
        cantidad: Math.max(0, Math.round(Number(projectedQty[id]) || 0)),
        inversion: Math.max(0, Math.round(Number(serviceInvestments[id]) || 0)),
        precio: Math.max(0, Math.round(Number(servicePrices[id] ?? serviceCatalog.find((item) => item.id === id)?.precio) || 0)),
      }))
      serviciosApi
        .syncEventOffers(eventId, serviceIds, proyecciones, form.ganancia_eclesiastica_id)
        .then((saved) => {
          if (editing?.id !== eventId) return
          applyGainSnapshot(saved)
        })
        .catch((err) => notices.error(getApiErrorMessage(err, 'No se pudo actualizar la ganancia guardada')))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [
    showForm,
    editing,
    formIsEconomic,
    loadingServices,
    serviceIds,
    servicePrices,
    serviceInvestments,
    projectedQty,
    serviceCatalog,
    form.ganancia_eclesiastica_id,
    notices,
  ])

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

  function markAllParticipants(participa: boolean | '', mode: 'all' | 'empty' = 'all') {
    const next = Object.fromEntries(
      participants.map((row) => {
        const current = participantDraftRef.current[row.persona_id] ?? { participa: '' as const, ventas: {} }
        const hasQty = Object.values(current.ventas).some((qty) => Number(qty) > 0)
        const hasData = current.participa !== '' || hasQty || (Number(row.abonado) || 0) > 0
        if (mode === 'empty' && hasData) {
          return [row.persona_id, current]
        }
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

  async function deliverParticipant(
    personaId: number,
    ventas: Array<{ producto_servicio_id: number; cantidad_entregada: number }>,
  ) {
    if (!participantsFor || participantsFor.estado !== 'en_proceso') return
    try {
      const next = await serviciosApi.deliver(participantsFor.id, personaId, ventas)
      setParticipants(next.integrantes)
      const nextDraft = emptyParticipantsDraft(next.integrantes)
      participantDraftRef.current = nextDraft
      setParticipantDraft(nextDraft)
      notices.success('Entrega confirmada. Ese es el valor que se cobra.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo confirmar la entrega'))
      throw err
    }
  }

  function openParticipantAbono(personaId: number) {
    if (participantsFor?.estado !== 'en_proceso') return
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
    if (!participantsFor || !canAbonar || !abonoForId || participantsFor.estado !== 'en_proceso') return
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
        comprobante: abonoDraft.comprobante,
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

  async function reviewParticipantAbono(
    abono: { id: number },
    estado: 'aprobado' | 'rechazado',
    monto?: number,
  ) {
    if (!canAbonar) return
    if (estado === 'aprobado' && (!monto || monto <= 0)) {
      notices.warning('Escribe el valor que se ve en el pantallazo.')
      return
    }
    try {
      const next = await abonosApi.review(abono.id, { estado, monto })
      setParticipants((current) =>
        current.map((row) => {
          if (row.persona_id !== next.persona_id) return row
          return {
            ...row,
            abonado: next.abonado,
            abonos: (row.abonos ?? []).map((item) => (item.id === next.abono.id ? next.abono : item)),
          }
        }),
      )
      notices.success(estado === 'aprobado' ? 'Abono aprobado.' : 'Abono rechazado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo revisar el abono'))
      throw err
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
      ...(formIsEconomic && canViewGanancias
        ? {
            ganancia_eclesiastica_id: form.ganancia_eclesiastica_id
              ? Number(form.ganancia_eclesiastica_id)
              : null,
            capital: Math.max(0, Math.round(Number(form.capital) || 0)),
          }
        : {}),
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
        await serviciosApi.syncEventOffers(
          saved.id,
          serviceIds,
          serviceIds.map((id) => ({
            producto_servicio_id: id,
            cantidad: Math.max(0, Math.round(Number(projectedQty[id]) || 0)),
            inversion: Math.max(0, Math.round(Number(serviceInvestments[id]) || 0)),
            precio: Math.max(0, Math.round(Number(servicePrices[id] ?? serviceCatalog.find((item) => item.id === id)?.precio) || 0)),
          })),
        )
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
  const pendingProofCount = pendingProofs(participants).length
  const participantBody = participantTab === 'comprobantes' ? (
    loadingParticipants ? (
      <p className="app-panel__muted">Cargando comprobantes…</p>
    ) : (
      <PendingProofsPanel
        members={participants}
        canReview={canAbonar}
        onReview={reviewParticipantAbono}
      />
    )
  ) : participantTab === 'ganancias' && canViewGanancias ? (
    loadingParticipants ? (
      <p className="app-panel__muted">Cargando integrantes…</p>
    ) : (
      <EventActivitySummary
        members={participants}
        services={participantServices}
        draft={participantDraft}
        capital={Number(participantsFor?.capital) || 0}
        gananciaConfigId={participantsFor?.ganancia_eclesiastica_id}
        gananciaRegistro={participantsFor?.ganancia_registro}
        eventName={participantsFor?.name}
        canEntregar={canTakeAttendance && participantsFor?.estado === 'en_proceso'}
        onStartAbono={
          canAbonar && participantsFor?.estado === 'en_proceso' ? openParticipantAbono : undefined
        }
        onDeliver={deliverParticipant}
      />
    )
  ) : (
    <>
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
          eventEstado={participantsFor?.estado}
          participationLocked={isEconomicParticipationLocked(participantsFor)}
          saving={savingParticipants}
          payingId={payingId}
          onChange={setParticipa}
          onQty={setParticipantQty}
          onMarkAll={markAllParticipants}
          onStartAbono={openParticipantAbono}
          onReviewAbono={reviewParticipantAbono}
        />
      ) : null}
    </>
  )

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
          !editing || eventTab === 'ficha' || eventTab === 'ganancias' ? (
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
        <div className={editing || formIsEconomic ? 'app-tabs has-sheet' : undefined}>
        {editing || formIsEconomic ? (
          <EventTabs
            tab={eventTab}
            showSubeventos={Boolean(editing)}
            showGanancias={formIsEconomic && canViewGanancias}
            onChange={setEventTab}
          />
        ) : null}
        <div className={editing || formIsEconomic ? 'app-tabs__body' : undefined}>
        {editing && eventTab === 'subeventos' ? (
          <EventSubeventsPanel parent={editing} tipos={tipos} canCreate={canCreate} />
        ) : (
        <form id="event-form" className="admin-form event-form" onSubmit={onSave}>
          {eventTab === 'ganancias' && formIsEconomic && canViewGanancias ? (
            <EventGananciasPanel
              value={form.ganancia_eclesiastica_id}
              canChange={canChangeGanancia}
              services={serviceIds.flatMap((id) => {
                const service = serviceCatalog.find((item) => item.id === id)
                if (!service) return []
                return [{
                  id: service.id,
                  nombre: service.nombre,
                  precio: Math.round(Number(servicePrices[id] ?? service.precio) || 0),
                  totalRegistrado: gainLines[id]?.total ?? 0,
                  gananciaUnidad: gainLines[id]?.gananciaUnidad ?? 0,
                  image_url: service.image_url,
                  icono: service.icono,
                  descripcion: service.descripcion,
                  tipo: service.tipo,
                }]
              })}
              cantidades={projectedQty}
              inversiones={serviceInvestments}
              onInversion={(id, inversion) =>
                setServiceInvestments((current) => ({ ...current, [id]: inversion }))
              }
              capital={form.capital}
              loadingServices={loadingServices}
              onChange={(ganancia_eclesiastica_id) =>
                setForm((current) =>
                  current.ganancia_eclesiastica_id === ganancia_eclesiastica_id
                    ? current
                    : { ...current, ganancia_eclesiastica_id },
                )
              }
              onCapital={(capital) => setForm((current) => ({ ...current, capital }))}
              registro={gainRecord}
            />
          ) : (
          <>
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
                lockRemovals={servicesLocked}
                prices={servicePrices}
                canEditPrice={form.estado === 'publicado'}
                onPrice={(id, precio) => setServicePrices((current) => ({ ...current, [id]: precio }))}
                onChange={(ids) => {
                  setServiceIds(ids)
                  setServicePrices((current) => {
                    const next = { ...current }
                    for (const id of ids) {
                      if (next[id] !== undefined) continue
                      const item = serviceCatalog.find((service) => service.id === id)
                      next[id] = item ? String(Math.round(Number(item.precio) || 0)) : ''
                    }
                    return next
                  })
                }}
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
          </>
          )}
        </form>
        )}
        </div>
        </div>
      </CreateDrawer>

      <CreateDrawer
        open={Boolean(participantsFor)}
        placement={drawerPlacement}
        title={participantsFor?.name || 'Ver evento'}
        subtitle="Ver evento"
        cover={resolveFileUrl(participantsFor?.banner_url)}
        onClose={closeParticipants}
      >
        {!loadingParticipants ? (
          <ParticipantEventStats
            members={participants}
            services={participantServices}
            draft={participantDraft}
            eventEstado={participantsFor?.estado}
          />
        ) : null}
        {canViewGanancias || canAbonar ? (
          <AppTabs
            label="Ver evento"
            value={participantTab}
            onChange={setParticipantTab}
            tabs={[
              { id: 'participantes', label: 'Participantes' },
              ...(canViewGanancias ? [{ id: 'ganancias' as const, label: 'Ganancias' }] : []),
              {
                id: 'comprobantes' as const,
                label: pendingProofCount ? `Confirmar abono (${pendingProofCount})` : 'Confirmar abono',
              },
            ]}
          >
            {participantBody}
          </AppTabs>
        ) : (
          participantBody
        )}
      </CreateDrawer>

      <CreateDrawer
        open={Boolean(abonoFor)}
        stacked
        placement={drawerPlacement}
        title={abonoFor?.full_name || 'Registrar abono'}
        subtitle="Recaudo"
        cover={resolveFileUrl(participantsFor?.banner_url)}
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

      {joinFor && isEconomicEvent(joinFor) ? <EventMemberJoin event={joinFor} onClose={closeJoin} /> : null}
      {joinFor && isInscribibleEvent(joinFor) ? (
        <EventInscriptionJoin event={joinFor} onClose={closeJoin} onChanged={patchEvent} />
      ) : null}
      {inscriptionsFor ? (
        <EventInscriptionRoster
          event={inscriptionsFor}
          canEdit={canManageInscriptions && isInscriptionOpen(inscriptionsFor)}
          onClose={closeInscriptions}
          onChanged={patchEvent}
        />
      ) : null}

      <EventsViewToggle
        view={view}
        filtersOpen={filtersOpen}
        onChange={setView}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
        filters={
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
        }
      >
        {loading ? <p className="admin-empty">Cargando eventos…</p> : null}

      {!loading && events.length === 0 ? (
        <AppPanel className="admin-events__empty" narrow>
          <p className="app-panel__kicker">Agenda</p>
          <h2 className="app-panel__title">No hay eventos</h2>
          <p className="app-panel__subtitle">
            {view === 'cuadricula' && hasListFilters
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
          canJoin={canJoinEvent}
          canManageInscriptions={canManageInscriptions}
          canCreate={canEditEvents}
          tipos={tipos}
          organizacionId={ctx?.organizacion_id}
          onAttendance={openAttendance}
          onJoin={openJoin}
          onInscriptions={openInscriptions}
          onEdit={openEdit}
          canChangeEstado={canViewGanancias}
          onEstadoChange={changeEventEstado}
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
              canJoin={canJoinEvent}
              canManageInscriptions={canManageInscriptions}
              canEdit={canEditEvents && item.organizacion?.id === ctx?.organizacion_id}
              canManageSubevents={canEditEvents && item.organizacion?.id === ctx?.organizacion_id}
              onAttendance={openAttendance}
              onJoin={openJoin}
              onInscriptions={openInscriptions}
              onEdit={openEdit}
              canChangeEstado={canViewGanancias && item.organizacion?.id === ctx?.organizacion_id}
              onEstadoChange={changeEventEstado}
            />
          ))}
        </div>
      ) : null}
      </EventsViewToggle>
    </section>
  )
}
