import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { resolveFileUrl } from '../api/baseUrl'
import { getApiErrorMessage } from '../api/client'
import { presupuestoApi } from '../api/presupuesto'
import type {
  AttendanceEvent,
  PresupuestoDestinatario,
  PresupuestoDetalle,
  PresupuestoEvento,
  PresupuestoItem,
  PresupuestoTipo,
} from '../api/types'
import { AdminIcon } from '../admin/AdminIcon'
import { canAccessClubPresupuesto } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import { AttendanceEventSelect, formatEventChipDate } from '../components/attendance/AttendanceEventSelect'
import { PresupuestoStudio } from '../components/presupuesto/PresupuestoStudio'
import { destLabel, initials, itemKey } from '../components/presupuesto/presupuestoView'
import { AppPanel } from '../theme/AppPanel'
import { CreateDrawer } from '../theme/CreateDrawer'
import { useNotice } from '../theme/NoticeProvider'
import '../theme/presupuesto.css'

const MOBILE_PRESUPUESTO = '(max-width: 900px)'

type ItemDraft = {
  id?: number
  concepto: string
  tipo: PresupuestoTipo
  monto: string
  destinatario: PresupuestoDestinatario
}

function emptyDraft(destinatario: PresupuestoDestinatario): ItemDraft {
  return { concepto: '', tipo: 'individual', monto: '', destinatario }
}

function itemsPayload(detail: PresupuestoDetalle) {
  const seen = new Set<string>()
  return [...detail.bloques.miembros.items, ...detail.bloques.acompanantes.items]
    .filter((item) => {
      const key = itemKey(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((item, orden) => ({
      concepto: item.concepto,
      tipo: item.tipo,
      monto: item.monto,
      destinatario: item.destinatario,
      orden,
    }))
}

function placeItem(detail: PresupuestoDetalle, item: PresupuestoItem): PresupuestoDetalle {
  if (item.destinatario === 'ambos') {
    detail.bloques.miembros.items.push(item)
    detail.bloques.acompanantes.items.push(item)
    return detail
  }
  detail.bloques[item.destinatario].items.push(item)
  return detail
}

function asAttendanceEvents(items: PresupuestoEvento[]): AttendanceEvent[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    starts_at: item.starts_at ?? null,
    lugar: item.lugar,
    image_url: item.image_url,
    banner_url: item.banner_url,
    integrantes_count: item.miembros_count,
  }))
}

export function PresupuestoPage() {
  const auth = useAuth()
  const ctx = auth.user?.contexto
  const canEdit =
    canAccessClubPresupuesto({
      rolName: ctx?.rol_name,
      organizacionId: ctx?.organizacion_id,
    }) || auth.can('presupuesto.update')
  const notices = useNotice()

  const [events, setEvents] = useState<PresupuestoEvento[]>([])
  const [eventoId, setEventoId] = useState<number | null>(null)
  const [detail, setDetail] = useState<PresupuestoDetalle | null>(null)
  const [query, setQuery] = useState('')
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_PRESUPUESTO).matches : false,
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [itemOpen, setItemOpen] = useState(false)
  const [draft, setDraft] = useState<ItemDraft>(emptyDraft('miembros'))
  const [acompanantesDraft, setAcompanantesDraft] = useState('')
  const [nombreDraft, setNombreDraft] = useState('')

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return events
    return events.filter((item) => {
      const haystack = `${item.name} ${formatEventChipDate(item.starts_at)}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [events, query])

  const selectedEvent = events.find((item) => item.id === eventoId) ?? detail?.evento ?? null

  useEffect(() => {
    const media = window.matchMedia(MOBILE_PRESUPUESTO)
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
    setLoadingEvents(true)
    presupuestoApi
      .eventos()
      .then((next) => {
        if (cancelled) return
        setEvents(next)
        setEventoId((current) => {
          if (!current) return null
          return next.some((item) => item.id === current) ? current : null
        })
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar los campamentos'))
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false)
      })
    return () => {
      cancelled = true
    }
  }, [ctx?.organizacion_id, notices])

  useEffect(() => {
    if (!eventoId) {
      setDetail(null)
      setAcompanantesDraft('')
      setNombreDraft('')
      return
    }
    let cancelled = false
    setLoadingDetail(true)
    presupuestoApi
      .show(eventoId)
      .then((next) => {
        if (cancelled) return
        applyDetail(next)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar el presupuesto'))
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventoId, notices])

  function applyDetail(next: PresupuestoDetalle) {
    setDetail(next)
    setAcompanantesDraft(String(next.acompanantes_count ?? 0))
    setNombreDraft(next.nombre ?? '')
    setEvents((current) =>
      current.map((item) =>
        item.id === next.evento.id
          ? {
              ...item,
              ...next.evento,
              tiene_presupuesto: (next.presupuestos?.length ?? 0) > 0,
              presupuestos_count: next.presupuestos?.length ?? 0,
              miembros_count: next.miembros_count,
              acompanantes_count: next.cantidades.acompanantes,
            }
          : item,
      ),
    )
  }

  function pickEvent(id: number) {
    setEventoId(id)
    if (isMobile) setDrawerOpen(true)
  }

  async function persist(next: PresupuestoDetalle) {
    if (!canEdit) {
      notices.error('No puedes editar el presupuesto.')
      return
    }
    setSaving(true)
    try {
      const saved = await presupuestoApi.save(next.evento.id, {
        presupuesto_id: next.presupuesto_id,
        nombre: next.nombre ?? nombreDraft,
        activo: next.activo,
        acompanantes_count: next.acompanantes_count,
        items: itemsPayload(next),
      })
      applyDetail(saved)
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo guardar el presupuesto'))
    } finally {
      setSaving(false)
    }
  }

  async function selectBudget(id: number) {
    if (!eventoId || detail?.presupuesto_id === id) return
    setLoadingDetail(true)
    try {
      applyDetail(await presupuestoApi.show(eventoId, id))
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo cargar el presupuesto'))
    } finally {
      setLoadingDetail(false)
    }
  }

  async function createBudget() {
    if (!eventoId || !canEdit) return
    setSaving(true)
    try {
      applyDetail(
        await presupuestoApi.save(eventoId, {
          nombre: `Presupuesto ${(detail?.presupuestos?.length ?? 0) + 1}`,
          acompanantes_count: detail?.acompanantes_count ?? 0,
          items: [],
        }),
      )
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo crear el presupuesto'))
    } finally {
      setSaving(false)
    }
  }

  async function duplicateBudget() {
    if (!eventoId || !canEdit || !detail?.presupuesto_id) return
    setSaving(true)
    try {
      applyDetail(
        await presupuestoApi.save(eventoId, {
          nombre: `Copia de ${detail.nombre || 'presupuesto'}`,
          acompanantes_count: detail.acompanantes_count,
          items: itemsPayload(detail),
        }),
      )
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo duplicar el presupuesto'))
    } finally {
      setSaving(false)
    }
  }

  async function applyActive() {
    if (!detail?.presupuesto_id) return
    await persist({ ...detail, activo: true })
  }

  async function saveNombre() {
    if (!detail) return
    const nombre = nombreDraft.trim()
    if (!nombre || nombre === (detail.nombre ?? '')) return
    await persist({ ...detail, nombre })
  }

  async function deleteBudget() {
    if (!eventoId || !detail?.presupuesto_id || !canEdit) return
    setSaving(true)
    try {
      applyDetail(await presupuestoApi.remove(eventoId, detail.presupuesto_id))
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo quitar el presupuesto'))
    } finally {
      setSaving(false)
    }
  }

  function openItem(item?: PresupuestoItem) {
    setDraft(
      item
        ? {
            id: item.id,
            concepto: item.concepto,
            tipo: item.tipo,
            monto: String(item.monto),
            destinatario: item.destinatario,
          }
        : emptyDraft('miembros'),
    )
    setItemOpen(true)
  }

  async function submitItem(event: FormEvent) {
    event.preventDefault()
    if (!detail) return
    const concepto = draft.concepto.trim()
    const monto = Number(draft.monto.replace(',', '.'))
    if (!concepto) {
      notices.error('Escribe el concepto.')
      return
    }
    if (!Number.isFinite(monto) || monto < 0) {
      notices.error('El monto debe ser un número válido.')
      return
    }
    const nextItem: PresupuestoItem = {
      id: draft.id,
      concepto,
      tipo: draft.tipo,
      monto,
      destinatario: draft.destinatario,
      monto_total: 0,
      por_persona: null,
    }
    const keep = (item: PresupuestoItem) => draft.id == null || item.id !== draft.id
    const next: PresupuestoDetalle = {
      ...detail,
      bloques: {
        miembros: {
          ...detail.bloques.miembros,
          items: detail.bloques.miembros.items.filter(keep),
        },
        acompanantes: {
          ...detail.bloques.acompanantes,
          items: detail.bloques.acompanantes.items.filter(keep),
        },
      },
    }
    placeItem(next, nextItem)
    setItemOpen(false)
    await persist(next)
  }

  async function removeItem(target?: PresupuestoItem) {
    const id = target?.id ?? draft.id
    if (!detail || !id) return
    const next: PresupuestoDetalle = {
      ...detail,
      bloques: {
        miembros: {
          ...detail.bloques.miembros,
          items: detail.bloques.miembros.items.filter((item) => item.id !== id),
        },
        acompanantes: {
          ...detail.bloques.acompanantes,
          items: detail.bloques.acompanantes.items.filter((item) => item.id !== id),
        },
      },
    }
    setItemOpen(false)
    await persist(next)
  }

  async function saveAcompanantes() {
    if (!detail) return
    const value = Math.max(0, Math.round(Number(acompanantesDraft) || 0))
    if (value === detail.acompanantes_count) return
    await persist({ ...detail, acompanantes_count: value })
  }

  const studio = selectedEvent && detail && !loadingDetail ? (
    <PresupuestoStudio
      event={selectedEvent}
      detail={detail}
      canEdit={canEdit}
      saving={saving}
      nombreDraft={nombreDraft}
      acompanantesDraft={acompanantesDraft}
      onNombreChange={setNombreDraft}
      onSaveNombre={() => void saveNombre()}
      onSelectBudget={(id) => void selectBudget(id)}
      onCreateBudget={() => void createBudget()}
      onDuplicateBudget={() => void duplicateBudget()}
      onApplyActive={() => void applyActive()}
      onDeleteBudget={() => void deleteBudget()}
      onAddItem={() => openItem()}
      onEditItem={openItem}
      onRemoveItem={(item) => void removeItem(item)}
      onAcompanantesChange={setAcompanantesDraft}
      onSaveAcompanantes={() => void saveAcompanantes()}
      compactHero={isMobile}
    />
  ) : null

  return (
    <section className="admin-page admin-page--presupuesto">
      <AppPanel shine={false} className="presupuesto-workspace">
        <p className="app-panel__kicker">Planeación</p>
        <h2 className="app-panel__title">Presupuesto</h2>
        <p className="app-panel__subtitle">
          Elige un campamento y arma los costos de integrantes y acompañantes. El individual se multiplica
          por persona; el grupal se divide. Esto no genera cobros ni ventas.
        </p>
        {events.length > 0 && !isMobile ? (
          <div className="presupuesto-picker">
            <AttendanceEventSelect
              items={asAttendanceEvents(events)}
              eventoId={eventoId}
              label="Campamento"
              onSelect={pickEvent}
            />
          </div>
        ) : null}
      </AppPanel>

      {loadingEvents ? <p className="app-panel__muted">Cargando campamentos…</p> : null}

      {!loadingEvents && events.length === 0 ? (
        <AppPanel>
          <p className="app-panel__kicker">Agenda</p>
          <h2 className="app-panel__title">No hay campamentos</h2>
          <p className="app-panel__subtitle">
            Crea un evento en Eventos con tipo Campamento para poder armar su presupuesto.
          </p>
          <Link className="app-panel__link app-panel__link--accent" to="/eventos">
            Ir a Eventos
          </Link>
        </AppPanel>
      ) : null}

      {events.length > 0 && isMobile ? (
        <AppPanel shine={false} className="presupuesto-board">
          <label className="presupuesto-search">
            Buscar
            <span className="app-panel__field">
              <AdminIcon name="calendar" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar campamento…"
              />
            </span>
          </label>
          <p className="presupuesto-board__meta">
            Se encontraron {filteredEvents.length} campamento{filteredEvents.length === 1 ? '' : 's'}
          </p>
          {filteredEvents.length === 0 ? (
            <p className="app-panel__hint">Ningún campamento coincide con esa búsqueda.</p>
          ) : null}
          <div className="presupuesto-picks">
            {filteredEvents.map((item) => {
              const photo = resolveFileUrl(item.image_url)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`presupuesto-pick${item.id === eventoId ? ' is-on' : ''}`}
                  onClick={() => pickEvent(item.id)}
                >
                  <span className="presupuesto-avatar" aria-hidden="true">
                    {photo ? <img src={photo} alt="" /> : initials(item.name)}
                  </span>
                  <span className="presupuesto-pick__who">
                    <strong>{item.name}</strong>
                    <small>{formatEventChipDate(item.starts_at)}</small>
                  </span>
                  <span className="presupuesto-pick__count">
                    <strong>{item.miembros_count ?? 0}</strong>
                    <small>
                      {item.tiene_presupuesto
                        ? `${item.presupuestos_count ?? 1} presupuesto${(item.presupuestos_count ?? 1) === 1 ? '' : 's'}`
                        : 'Sin presupuesto'}
                    </small>
                  </span>
                  <AdminIcon name="chevronRight" />
                </button>
              )
            })}
          </div>
        </AppPanel>
      ) : null}

      {!isMobile && events.length > 0 && !eventoId ? (
        <p className="app-panel__hint">Elige un campamento para ver y armar su presupuesto.</p>
      ) : null}

      {loadingDetail ? <p className="app-panel__muted">Cargando presupuesto…</p> : null}

      {!isMobile && studio}

      {isMobile ? (
        <CreateDrawer
          open={drawerOpen && Boolean(selectedEvent)}
          title={selectedEvent?.name || 'Presupuesto'}
          subtitle={selectedEvent ? formatEventChipDate(selectedEvent.starts_at) : 'Campamento'}
          cover={resolveFileUrl(selectedEvent?.banner_url)}
          avatar={resolveFileUrl(selectedEvent?.image_url)}
          avatarFallback={selectedEvent ? initials(selectedEvent.name) : 'CP'}
          placement="bottom"
          onClose={() => setDrawerOpen(false)}
        >
          <div className="presupuesto-detail">{studio}</div>
        </CreateDrawer>
      ) : null}

      <CreateDrawer
        open={itemOpen}
        title={draft.id ? 'Editar concepto' : 'Agregar concepto'}
        subtitle={destLabel(draft.destinatario)}
        stacked={isMobile && drawerOpen}
        onClose={() => setItemOpen(false)}
        footer={
          <>
            {draft.id && canEdit ? (
              <button type="button" className="app-panel__btn--ghost" disabled={saving} onClick={() => void removeItem()}>
                Quitar
              </button>
            ) : null}
            <button type="submit" form="presupuesto-item-form" className="app-panel__btn--primary" disabled={saving || !canEdit}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="presupuesto-item-form" className="presupuesto-form" onSubmit={(event) => void submitItem(event)}>
          <label>
            Concepto
            <span className="app-panel__field">
              <input
                value={draft.concepto}
                onChange={(event) => setDraft((current) => ({ ...current, concepto: event.target.value }))}
                placeholder="Inscripción, transporte…"
              />
            </span>
          </label>
          <div className="presupuesto-form__row">
            <label>
              Tipo
              <span className="app-panel__field">
                <select
                  value={draft.tipo}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, tipo: event.target.value as PresupuestoTipo }))
                  }
                >
                  <option value="individual">Individual (por persona)</option>
                  <option value="grupal">Grupal (total a dividir)</option>
                </select>
              </span>
            </label>
            <label>
              Monto
              <span className="app-panel__field">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.monto}
                  onChange={(event) => setDraft((current) => ({ ...current, monto: event.target.value }))}
                />
              </span>
            </label>
          </div>
          <label>
            Destinatario
            <span className="app-panel__field">
              <select
                value={draft.destinatario}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    destinatario: event.target.value as PresupuestoDestinatario,
                  }))
                }
              >
                <option value="miembros">Integrantes</option>
                <option value="acompanantes">Acompañantes</option>
                <option value="ambos">Ambos</option>
              </select>
            </span>
          </label>
        </form>
      </CreateDrawer>
    </section>
  )
}
