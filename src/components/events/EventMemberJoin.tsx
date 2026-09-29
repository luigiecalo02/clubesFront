import { useEffect, useMemo, useState } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
import { getApiErrorMessage } from '../../api/client'
import { serviciosApi } from '../../api/servicios'
import type { AbonoMovimiento, EventParticipantService, EventSummary } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import { isEconomicParticipationLocked } from './EventCard'
import { CreateDrawer } from '../../theme/CreateDrawer'
import { formatDate } from '../../theme/dates'
import { useNotice } from '../../theme/NoticeProvider'
import { ServiceThumb } from '../services/ServiceVisual'
import '../../theme/attendance-mark.css'

type EventMemberJoinProps = {
  event: EventSummary
  onClose: () => void
}

function formatPrice(value: number | string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function servicePrice(service: EventParticipantService): number {
  const amount = Number(service.precio)
  return Number.isFinite(amount) ? amount : 0
}

function saleTotals(services: EventParticipantService[], ventas: Record<number, number>) {
  return services.reduce(
    (acc, service) => {
      const cantidad = Math.max(0, Number(ventas[service.id]) || 0)
      return {
        unidades: acc.unidades + cantidad,
        recaudo: acc.recaudo + cantidad * servicePrice(service),
      }
    },
    { unidades: 0, recaudo: 0 },
  )
}

function formatAbonoWhen(value?: string | null): string {
  const day = formatDate(value)
  if (!value) return day || 'Abono'
  const time = new Date(value)
  if (Number.isNaN(time.getTime())) return day || 'Abono'
  const hours = String(time.getHours()).padStart(2, '0')
  const minutes = String(time.getMinutes()).padStart(2, '0')
  return day ? `${day} ${hours}:${minutes}` : `${hours}:${minutes}`
}

function ventasPayload(ventas: Record<number, number>) {
  return Object.entries(ventas)
    .map(([productoId, cantidad]) => ({
      producto_servicio_id: Number(productoId),
      cantidad: Math.max(0, Number(cantidad) || 0),
    }))
    .filter((item) => item.cantidad > 0)
}

export function EventMemberJoin({ event, onClose }: EventMemberJoinProps) {
  const notices = useNotice()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState<EventParticipantService[]>([])
  const [ventas, setVentas] = useState<Record<number, number>>({})
  const [already, setAlready] = useState(false)
  const [abonado, setAbonado] = useState(0)
  const [abonos, setAbonos] = useState<AbonoMovimiento[]>([])
  const [tab, setTab] = useState<'servicios' | 'historial'>('servicios')
  const totals = useMemo(() => saleTotals(services, ventas), [services, ventas])
  const faltante = totals.recaudo - abonado
  const locked = isEconomicParticipationLocked(event)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    serviciosApi
      .myParticipation(event.id)
      .then((data) => {
        if (cancelled) return
        setServices(data.servicios ?? [])
        setAlready(data.integrante.participa === true)
        setVentas(
          Object.fromEntries((data.integrante.ventas ?? []).map((venta) => [venta.producto_servicio_id, venta.cantidad])),
        )
        setAbonado(Number(data.recaudo?.abonado) || 0)
        setAbonos(data.recaudo?.abonos ?? [])
      })
      .catch((err) => {
        if (cancelled) return
        notices.error(getApiErrorMessage(err, 'No se pudo cargar tu participación'))
        onClose()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [event.id])

  function setQty(productoServicioId: number, cantidad: number) {
    const qty = Number.isFinite(cantidad) ? Math.max(0, Math.floor(cantidad)) : 0
    setVentas((current) => ({ ...current, [productoServicioId]: qty }))
  }

  async function persist(participa: boolean) {
    if (locked) return
    setSaving(true)
    try {
      await serviciosApi.saveMyParticipation(event.id, {
        participa,
        ventas: participa ? ventasPayload(ventas) : [],
      })
      notices.success(participa ? 'Quedaste inscrito con tus cantidades.' : 'Ya no participas en esta actividad.')
      onClose()
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo guardar tu participación'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <CreateDrawer
      open
      title={locked ? (already ? 'Tu venta' : 'Actividad') : already ? 'Tu venta' : 'Participar'}
      subtitle={event.name}
      cover={resolveFileUrl(event.banner_url)}
      onClose={onClose}
      footer={
        loading || locked ? null : (
          <>
            <button
              type="button"
              className="app-panel__btn--ghost"
              disabled={saving}
              onClick={() => void persist(false)}
            >
              No participo
            </button>
            <button
              type="button"
              className="app-panel__btn--primary"
              disabled={saving}
              onClick={() => void persist(true)}
            >
              {already ? 'Actualizar' : 'Participar'}
            </button>
          </>
        )
      }
    >
      {loading ? <p className="app-panel__muted">Cargando servicios…</p> : null}
      {!loading ? (
        <div className="attendance-mark attendance-mark--join">
          <p className="app-panel__subtitle">
            {locked
              ? 'La actividad ya no admite inscripciones. Aquí solo puedes consultar tus cantidades, el recaudo y los abonos.'
              : 'Elige cuántas unidades vas a vender. Quedas marcado como participante, igual que si la directiva te inscribiera.'}
          </p>
          <div className="attendance-mark__toolbar">
            <div className="attendance-mark__stats" aria-live="polite">
              <p className="attendance-mark__stat attendance-mark__stat--puntual">
                <strong>{totals.unidades}</strong>
                <span>A vender</span>
              </p>
              <p className="attendance-mark__stat attendance-mark__stat--puntual">
                <strong>{formatPrice(totals.recaudo)}</strong>
                <span>Recaudo</span>
              </p>
              <p className="attendance-mark__stat attendance-mark__stat--presente">
                <strong>{formatPrice(abonado)}</strong>
                <span>Abonado</span>
              </p>
              <p className="attendance-mark__stat attendance-mark__stat--ausente">
                <strong>{formatPrice(faltante)}</strong>
                <span>Faltante</span>
              </p>
            </div>
          </div>
          <div className="admin-events__view-tabs" role="tablist" aria-label="Detalle de tu venta">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'servicios'}
              className={`admin-events__view${tab === 'servicios' ? ' is-on' : ''}`}
              onClick={() => setTab('servicios')}
            >
              <AdminIcon name="box" />
              Servicios
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'historial'}
              className={`admin-events__view${tab === 'historial' ? ' is-on' : ''}`}
              onClick={() => setTab('historial')}
            >
              <AdminIcon name="wallet" />
              Historial
            </button>
          </div>
          {tab === 'servicios' && services.length === 0 ? (
            <p className="app-panel__hint">Esta actividad todavía no tiene servicios asociados.</p>
          ) : null}
          {tab === 'servicios' && services.length ? (
            <ul className="attendance-mark__sale-list">
              {services.map((service) => {
                const cantidad = ventas[service.id] ?? 0
                return (
                  <li key={service.id} className="attendance-mark__sale">
                    <span className="attendance-mark__sale-name">
                      <ServiceThumb item={service} />
                      {service.nombre}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      aria-label={`Cantidad de ${service.nombre}`}
                      disabled={saving || locked}
                      readOnly={locked}
                      value={cantidad}
                      onChange={(event) => setQty(service.id, Number(event.target.value))}
                    />
                    <span className="attendance-mark__sale-price">
                      <small>{formatPrice(servicePrice(service))}</small>
                      <strong>{formatPrice(cantidad * servicePrice(service))}</strong>
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : null}
          {tab === 'historial' && abonos.length === 0 ? (
            <p className="app-panel__hint">Todavía no hay abonos registrados en esta actividad.</p>
          ) : null}
          {tab === 'historial' && abonos.length ? (
            <ul className="attendance-mark__abonos">
              {abonos.map((abono) => (
                <li key={abono.id}>
                  <span>
                    {formatAbonoWhen(abono.created_at)}
                    {abono.nota ? ` · ${abono.nota}` : ''}
                  </span>
                  <strong>{formatPrice(abono.monto)}</strong>
                </li>
              ))}
            </ul>
          ) : null}
          {saving ? <p className="app-panel__muted">Guardando…</p> : null}
        </div>
      ) : null}
    </CreateDrawer>
  )
}
