import { useEffect, useMemo, useState } from 'react'
import { abonosApi } from '../../api/abonos'
import { resolveFileUrl } from '../../api/baseUrl'
import { getApiErrorMessage } from '../../api/client'
import { serviciosApi } from '../../api/servicios'
import type { AbonoMovimiento, EventParticipantService, EventSummary } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import { MY_ABONOS_REGISTER_PERMISSION } from '../../admin/menu'
import { useAuth } from '../../auth/AuthProvider'
import { AbonoProofReview, AbonoShotButton, abonoEstadoLabel } from '../abonos/AbonoProofReview'
import { isEconomicParticipationLocked } from './EventCard'
import { saleGain } from './ParticipantsMarkList'
import { compressReceiptImage } from '../../theme/cropImage'
import { AppTabs } from '../../theme/AppTabs'
import { CreateDrawer } from '../../theme/CreateDrawer'
import { formatDate } from '../../theme/dates'
import { useNotice } from '../../theme/NoticeProvider'
import { NumberPadDialog } from '../../theme/NumberPad'
import { ServiceThumb } from '../services/ServiceVisual'
import { ProgressBar, SummaryDonut, SummaryKpi, summaryPercent } from './SummaryCards'
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
  const auth = useAuth()
  const canRegisterAbono = auth.can(MY_ABONOS_REGISTER_PERMISSION)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState<EventParticipantService[]>([])
  const [ventas, setVentas] = useState<Record<number, number>>({})
  const [entregadas, setEntregadas] = useState<Record<number, number | null>>({})
  const [already, setAlready] = useState(false)
  const [abonado, setAbonado] = useState(0)
  const [abonos, setAbonos] = useState<AbonoMovimiento[]>([])
  const [tab, setTab] = useState<'servicios' | 'historial'>('servicios')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [sendingProof, setSendingProof] = useState(false)
  const [padId, setPadId] = useState<number | null>(null)
  const billed = useMemo(
    () =>
      Object.fromEntries(
        services.map((service) => {
          const entregada = entregadas[service.id]
          const pedido = ventas[service.id] ?? 0
          return [service.id, entregada == null ? pedido : entregada]
        }),
      ),
    [entregadas, services, ventas],
  )
  const totals = useMemo(() => saleTotals(services, billed), [billed, services])
  const hayEntrega = services.some((service) => entregadas[service.id] != null)
  const padService = services.find((service) => service.id === padId) ?? null
  const faltante = totals.recaudo - abonado
  const cobertura = totals.recaudo > 0 ? Math.min(Math.max(abonado, 0), totals.recaudo) / totals.recaudo : 0
  const ganancia = {
    ganada: Math.round(saleGain(services, billed) * cobertura),
    proyectada: saleGain(services, ventas),
  }
  const locked = isEconomicParticipationLocked(event)
  const canSendProof = canRegisterAbono && event.estado === 'en_proceso' && already && !loading

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
        setEntregadas(
          Object.fromEntries(
            (data.integrante.ventas ?? []).map((venta) => [
              venta.producto_servicio_id,
              venta.cantidad_entregada == null ? null : venta.cantidad_entregada,
            ]),
          ),
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

  function openPad(productoServicioId: number) {
    if (saving || locked) return
    setPadId(productoServicioId)
  }

  async function pickProof(file: File | null) {
    if (proofPreview) URL.revokeObjectURL(proofPreview)
    setProofFile(null)
    setProofPreview(null)
    if (!file) return
    try {
      const compact = await compressReceiptImage(file)
      setProofFile(compact)
      setProofPreview(URL.createObjectURL(compact))
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo preparar el pantallazo'))
    }
  }

  async function submitProof() {
    if (!canSendProof || !proofFile || sendingProof) return
    setSendingProof(true)
    try {
      const next = await abonosApi.submitComprobante(event.id, proofFile)
      setAbonado(Number(next.abonado) || 0)
      setAbonos(next.abonos ?? [])
      if (proofPreview) URL.revokeObjectURL(proofPreview)
      setProofFile(null)
      setProofPreview(null)
      notices.success('Abono enviado. Queda pendiente hasta que la directiva lo apruebe.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo enviar el abono'))
    } finally {
      setSendingProof(false)
    }
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
            <button type="button" className="app-panel__btn--ghost" onClick={onClose}>
              Cerrar
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
            {canSendProof && faltante <= 0
              ? 'La actividad está en proceso. Ya no tienes saldo pendiente en esta actividad.'
              : canSendProof
                ? 'La actividad está en proceso. Puedes enviar el pantallazo de tu abono. Queda pendiente hasta que la directiva lo apruebe.'
                : locked
                  ? 'La actividad ya no admite inscripciones. Aquí solo puedes consultar tus cantidades, el recaudo y los abonos.'
                  : 'Elige cuántas unidades vas a vender. Quedas marcado como participante, igual que si la directiva te inscribiera.'}
          </p>
          <div className="attendance-mark__toolbar">
            <div className="event-stats" aria-live="polite">
              <SummaryKpi icon="box" tone="gold" label={hayEntrega ? 'Entregadas' : 'A vender'} value={totals.unidades}>
                <small>{hayEntrega ? 'Según lo entregado' : 'Unidades en total'}</small>
              </SummaryKpi>
              <SummaryKpi icon="calculator" tone="info" label="Recaudo" value={formatPrice(totals.recaudo)}>
                <ProgressBar value={totals.recaudo > 0 ? 100 : 0} tone="info" />
                <small>{hayEntrega ? 'Según lo entregado' : 'Lo que vas a vender'}</small>
              </SummaryKpi>
              <SummaryKpi
                icon="coins"
                tone={ganancia.ganada < 0 ? 'danger' : 'ok'}
                label="Ganancia real"
                value={formatPrice(ganancia.ganada)}
              >
                <ProgressBar value={summaryPercent(ganancia.ganada, ganancia.proyectada)} />
                <small>Según lo abonado y tu parte en la actividad</small>
              </SummaryKpi>
              <SummaryKpi
                icon="trendUp"
                tone={ganancia.proyectada < 0 ? 'danger' : 'gold'}
                label="Ganancia proyectada"
                value={formatPrice(ganancia.proyectada)}
              >
                <small>Si vendes lo pedido</small>
              </SummaryKpi>
              <SummaryKpi
                icon="wallet"
                tone="ok"
                label="Ingresado en abonos"
                value={formatPrice(abonado)}
                className="is-paid is-wide"
              >
                <SummaryDonut value={summaryPercent(abonado, totals.recaudo)} label="del total" tone="ok" />
              </SummaryKpi>
              <SummaryKpi
                icon="target"
                tone="danger"
                label="Falta por cobrar"
                value={formatPrice(Math.max(0, faltante))}
                className="is-debt is-wide"
              >
                <SummaryDonut value={summaryPercent(Math.max(0, faltante), totals.recaudo)} label="del total" />
              </SummaryKpi>
            </div>
            {canSendProof && faltante > 0 ? (
              <button type="button" className="app-panel__btn--primary" onClick={() => setTab('historial')}>
                <AdminIcon name="wallet" />
                Abonar
              </button>
            ) : null}
            {canSendProof && faltante <= 0 ? (
              <span className="attendance-mark__paid">
                <AdminIcon name="check" />
                Al día
              </span>
            ) : null}
          </div>
          <AppTabs
            label="Detalle de tu venta"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'servicios', label: <><AdminIcon name="box" /> Servicios</> },
              { id: 'historial', label: <><AdminIcon name="wallet" /> Historial</> },
            ]}
          >
          {tab === 'servicios' && services.length === 0 ? (
            <p className="app-panel__hint">Esta actividad todavía no tiene servicios asociados.</p>
          ) : null}
          {tab === 'servicios' && services.length ? (
            <ul className="attendance-mark__sale-list">
              {services.map((service) => {
                const cantidad = ventas[service.id] ?? 0
                const entregada = entregadas[service.id]
                const cobrada = entregada == null ? cantidad : entregada
                return (
                  <li key={service.id} className="attendance-mark__sale">
                    <span className="attendance-mark__sale-name">
                      <ServiceThumb item={service} />
                      <span className="attendance-mark__sale-title">
                        {service.nombre}
                        <small>{formatPrice(servicePrice(service))}</small>
                      </span>
                    </span>
                    <span className="attendance-mark__sale-price">
                      <small>{entregada == null ? 'Total' : `Entregados ${entregada}`}</small>
                      <strong>{formatPrice(cobrada * servicePrice(service))}</strong>
                    </span>
                    <div className="attendance-mark__qty">
                      <button
                        type="button"
                        aria-label={`Quitar una unidad de ${service.nombre}`}
                        disabled={saving || locked || cantidad <= 0}
                        onClick={() => setQty(service.id, cantidad - 1)}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className="attendance-mark__qty-value"
                        aria-label={`Editar cantidad de ${service.nombre}`}
                        aria-expanded={padId === service.id}
                        disabled={saving || locked}
                        onClick={() => openPad(service.id)}
                      >
                        <span>{entregada == null ? 'Cantidad' : 'Pedido'}</span>
                        <strong>{cantidad}</strong>
                        {entregada == null ? null : <small>Entregados {entregada}</small>}
                      </button>
                      <button
                        type="button"
                        aria-label={`Agregar una unidad de ${service.nombre}`}
                        disabled={saving || locked}
                        onClick={() => setQty(service.id, cantidad + 1)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}
          {tab === 'historial' && canSendProof && faltante > 0 ? (
            <form
              className="abono-proof-form"
              onSubmit={(event) => {
                event.preventDefault()
                void submitProof()
              }}
            >
              <label>
                Pantallazo del abono
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={sendingProof}
                  onChange={(event) => void pickProof(event.target.files?.[0] ?? null)}
                />
              </label>
              {proofPreview ? <img className="abono-proof__shot" src={proofPreview} alt="Pantallazo listo para enviar" /> : null}
              <button type="submit" className="app-panel__btn--primary" disabled={sendingProof || !proofFile}>
                {sendingProof ? 'Enviando…' : 'Enviar abono'}
              </button>
            </form>
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
                  <span className="attendance-mark__abono-end">
                    <AbonoShotButton abono={abono} />
                    <strong>{abonoEstadoLabel(abono) ?? formatPrice(abono.monto)}</strong>
                  </span>
                  <AbonoProofReview abono={abono} hideShot />
                </li>
              ))}
            </ul>
          ) : null}
          {saving ? <p className="app-panel__muted">Guardando…</p> : null}
          </AppTabs>
        </div>
      ) : null}
      {padService ? (
        <NumberPadDialog
          title={padService.nombre}
          value={ventas[padService.id] ?? 0}
          onClose={() => setPadId(null)}
          onConfirm={(cantidad) => {
            setQty(padService.id, cantidad)
            setPadId(null)
          }}
        />
      ) : null}
    </CreateDrawer>
  )
}
