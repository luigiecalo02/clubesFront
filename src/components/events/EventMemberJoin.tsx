import { useEffect, useMemo, useState } from 'react'
import { abonosApi } from '../../api/abonos'
import { resolveFileUrl } from '../../api/baseUrl'
import { getApiErrorMessage } from '../../api/client'
import { serviciosApi } from '../../api/servicios'
import type {
  AbonoMovimiento,
  CuentaBancariaClub,
  EventParticipantService,
  EventSummary,
} from '../../api/types'
import { AbonoCuentaInfo } from '../abonos/AbonoCuentaInfo'
import {
  ParticipantIncomeSplit,
  approvedAbonosByProduct,
  participantShare,
  productGainLines,
  productGainTotal,
  type IncomeReparto,
} from './EventGananciasPanel'
import { isEconomicParticipationLocked } from './EventCard'
import { MY_ABONOS_REGISTER_PERMISSION } from '../../admin/menu'
import { useAuth } from '../../auth/AuthProvider'
import { AbonoProofReview, AbonoShotButton, abonoEstadoLabel } from '../abonos/AbonoProofReview'
import { AdminIcon } from '../../admin/AdminIcon'
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
  const [reparto, setReparto] = useState<IncomeReparto | null>(null)
  const [tab, setTab] = useState<'servicios' | 'historial'>('servicios')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [proofMontos, setProofMontos] = useState<Record<string, string>>({})
  const [sendingProof, setSendingProof] = useState(false)
  const [padId, setPadId] = useState<number | null>(null)
  const [cuenta, setCuenta] = useState<CuentaBancariaClub | null>(event.cuenta_bancaria ?? null)
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
  const productUnits = useMemo(
    () =>
      services
        .map((service) => {
          const unidades = Math.max(0, Number(billed[service.id]) || 0)
          const comprometido = unidades * servicePrice(service)
          const pagado = abonos.reduce((sum, abono) => {
            if (Number(abono.producto_servicio_id) !== service.id) return sum
            if (abono.estado && abono.estado !== 'aprobado') return sum
            return sum + (Number(abono.monto) || 0)
          }, 0)
          return {
            id: service.id,
            nombre: service.nombre,
            unidades,
            pendiente: Math.max(0, comprometido - pagado),
          }
        })
        .filter((item) => item.unidades > 0),
    [abonos, billed, services],
  )
  const proofPartidas = productUnits.flatMap((product) => {
    const monto = Math.round(Number(proofMontos[String(product.id)]) || 0)
    if (monto <= 0) return []
    return [{ producto_servicio_id: product.id, monto }]
  })
  const proofTotal = proofPartidas.reduce((sum, line) => sum + line.monto, 0)
  const hayEntrega = services.some((service) => entregadas[service.id] != null)
  const padService = services.find((service) => service.id === padId) ?? null
  const shares = useMemo(
    () =>
      productGainLines(
        services.map((service) => ({ id: service.id, nombre: service.nombre, qty: billed[service.id] ?? 0 })),
        services,
      ),
    [billed, services],
  )
  const gain = productGainTotal(shares)
  const faltante = totals.recaudo - abonado
  const coverage = totals.recaudo > 0 ? Math.min(1, Math.max(0, abonado) / totals.recaudo) : 0
  const ganancia = {
    ganada: reparto ? participantShare(reparto, Math.round(gain * coverage)) : 0,
    proyectada: reparto ? participantShare(reparto, gain) : 0,
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
        setReparto(data.ganancia?.reparto ?? null)
        setCuenta(data.evento?.cuenta_bancaria ?? event.cuenta_bancaria ?? null)
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

  function startAbono() {
    setTab('historial')
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
    if (productUnits.length > 0 && proofPartidas.length === 0) {
      notices.warning('Indica cuánto abonas de cada producto.')
      return
    }
    setSendingProof(true)
    try {
      const next = await abonosApi.submitComprobante(
        event.id,
        proofFile,
        proofPartidas.length ? proofPartidas : undefined,
      )
      setAbonado(Number(next.abonado) || 0)
      setAbonos(next.abonos ?? [])
      if (proofPreview) URL.revokeObjectURL(proofPreview)
      setProofFile(null)
      setProofPreview(null)
      setProofMontos({})
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
                {productUnits.length ? (
                  <ul className="event-summary__units">
                    {productUnits.map((product) => (
                      <li key={product.id}>
                        <span>{product.nombre}</span>
                        <strong>{product.unidades}</strong>
                        <small>{product.unidades === 1 ? 'unidad' : 'unidades'}</small>
                      </li>
                    ))}
                  </ul>
                ) : null}
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
                <small>Tu parte de la ganancia ya cubierta</small>
              </SummaryKpi>
              <SummaryKpi
                icon="trendUp"
                tone={ganancia.proyectada < 0 ? 'danger' : 'gold'}
                label="Ganancia proyectada"
                value={formatPrice(ganancia.proyectada)}
              >
                <small>Tu parte de la ganancia por producto</small>
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
              <button type="button" className="app-panel__btn--primary" onClick={startAbono}>
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
          {canSendProof && faltante > 0 && tab === 'historial' ? (
            <form
              className="abono-proof-form"
              onSubmit={(event) => {
                event.preventDefault()
                void submitProof()
              }}
            >
              <AbonoCuentaInfo cuenta={cuenta} />
              <p className="app-panel__subtitle">
                Una sola captura puede cubrir varios productos: indica cuánto va a cada uno.
              </p>
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
              {productUnits.length ? (
                <div className="abono-proof-form__splits">
                  <p className="abono-proof-form__splits-title">Valor por producto</p>
                  {productUnits.map((product) => (
                    <label key={product.id} className="abono-proof-form__split">
                      <span className="abono-proof-form__split-name">
                        <strong>{product.nombre}</strong>
                        <small>Falta {formatPrice(product.pendiente)}</small>
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        placeholder="0"
                        disabled={sendingProof}
                        value={proofMontos[String(product.id)] ?? ''}
                        onChange={(event) =>
                          setProofMontos((current) => ({
                            ...current,
                            [String(product.id)]: event.target.value.replace(/\D/g, ''),
                          }))
                        }
                      />
                    </label>
                  ))}
                  <p className="abono-proof-form__splits-total">
                    <span>Total de esta captura</span>
                    <strong>{formatPrice(proofTotal)}</strong>
                  </p>
                </div>
              ) : null}
              <button
                type="submit"
                className="app-panel__btn--primary"
                disabled={
                  sendingProof ||
                  !proofFile ||
                  (productUnits.length > 0 ? proofPartidas.length === 0 : false)
                }
              >
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
                    {abono.producto_nombre ? ` · ${abono.producto_nombre}` : ''}
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
          {tab === 'historial' && reparto ? (
            <section className="event-summary__income-block">
              <p className="app-panel__kicker">Reparto de tu abono</p>
              <ParticipantIncomeSplit
                ingreso={abonado}
                reparto={reparto}
                lines={shares}
                abonosByProduct={approvedAbonosByProduct(abonos)}
              />
            </section>
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
