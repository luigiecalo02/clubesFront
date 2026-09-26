import { useEffect, useMemo, useState } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
import { getApiErrorMessage } from '../../api/client'
import { serviciosApi } from '../../api/servicios'
import type { EventParticipantService, EventSummary } from '../../api/types'
import { CreateDrawer } from '../../theme/CreateDrawer'
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
  const totals = useMemo(() => saleTotals(services, ventas), [services, ventas])

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
      title={already ? 'Tu venta' : 'Participar'}
      subtitle={event.name}
      cover={resolveFileUrl(event.banner_url)}
      onClose={onClose}
      footer={
        loading ? null : (
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
            Elige cuántas unidades vas a vender. Quedas marcado como participante, igual que si la directiva te
            inscribiera.
          </p>
          <div className="attendance-mark__toolbar">
            <div className="attendance-mark__stats attendance-mark__stats--three" aria-live="polite">
              <p className="attendance-mark__stat attendance-mark__stat--puntual">
                <strong>{totals.unidades}</strong>
                <span>A vender</span>
              </p>
              <p className="attendance-mark__stat attendance-mark__stat--puntual">
                <strong>{formatPrice(totals.recaudo)}</strong>
                <span>Recaudo</span>
              </p>
              <p className="attendance-mark__stat">
                <strong>{services.length}</strong>
                <span>Servicios</span>
              </p>
            </div>
          </div>
          {services.length === 0 ? (
            <p className="app-panel__hint">Esta actividad todavía no tiene servicios asociados.</p>
          ) : (
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
                      disabled={saving}
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
          )}
          {saving ? <p className="app-panel__muted">Guardando…</p> : null}
        </div>
      ) : null}
    </CreateDrawer>
  )
}
