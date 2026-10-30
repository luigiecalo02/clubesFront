import { useState } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import { resolveFileUrl } from '../../api/baseUrl'
import type { EventParticipant, EventParticipantService } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'
import { downloadCsv } from '../../theme/csv'
import { memberInitials } from '../attendance/AttendanceMarkList'
import type { EventoGananciaRegistro } from '../../api/types'
import {
  EventGainDistribution,
  ParticipantIncomeSplit,
  approvedAbonosByProduct,
  coveredCapitalFromLines,
  liveGainSnapshot,
  participantGainFromLines,
  participantGainFromPaidLines,
  participantShare,
  productGainLines,
  sumPaidIncomeParts,
  useIncomeReparto,
} from './EventGananciasPanel'
import { participantEventCounts, saleGain, saleTotals, type ParticipantDraft } from './ParticipantsMarkList'
import { ProgressBar, SummaryIcon, summaryPercent as percent } from './SummaryCards'
import '../../theme/attendance-mark.css'

type PeopleSort = 'nombre' | 'cantidades' | 'entregados' | 'faltantes'

type EventActivitySummaryProps = {
  members: EventParticipant[]
  services: EventParticipantService[]
  draft: ParticipantDraft
  capital: number
  gananciaConfigId?: number | null
  gananciaRegistro?: EventoGananciaRegistro | null
  eventName?: string
  canEntregar?: boolean
  onStartAbono?: (personaId: number) => void
  onDeliver?: (
    personaId: number,
    ventas: Array<{ producto_servicio_id: number; cantidad_entregada: number }>,
  ) => Promise<void>
}

type OrderLine = {
  id: number
  nombre: string
  pedido: number
  entregada: number | null
}

type SummaryRow = {
  id: number
  name: string
  photo: string | null
  pedidos: number
  entregados: number
  entregado: boolean
  lineas: OrderLine[]
  recaudo: number
  abonado: number
  abonosByProduct: Record<number, number>
  ajusteParticipantes: number
  pendiente: number
  ganancia: number
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function orderLines(member: EventParticipant, services: EventParticipantService[], draft: ParticipantDraft): OrderLine[] {
  const requested = draft[member.persona_id]?.ventas ?? {}
  return services.flatMap((service) => {
    const pedido = Math.max(0, Number(requested[service.id]) || 0)
    if (pedido <= 0) return []
    const saved = member.ventas?.find((venta) => venta.producto_servicio_id === service.id)
    return [
      {
        id: service.id,
        nombre: service.nombre,
        pedido,
        entregada: saved?.cantidad_entregada == null ? null : Number(saved.cantidad_entregada),
      },
    ]
  })
}

function buildRows(
  members: EventParticipant[],
  services: EventParticipantService[],
  draft: ParticipantDraft,
): SummaryRow[] {
  return members.flatMap((member) => {
    const current = draft[member.persona_id]
    if (current?.participa !== true) return []
    const lineas = orderLines(member, services, draft)
    const entregado = lineas.length > 0 && lineas.every((line) => line.entregada != null)
    const billed = Object.fromEntries(
      lineas.map((line) => [line.id, line.entregada == null ? line.pedido : line.entregada]),
    )
    const recaudo = saleTotals(services, billed).recaudo
    const abonado = Number(member.abonado) || 0
    return [
      {
        id: member.persona_id,
        name: member.full_name,
        photo: resolveFileUrl(member.foto_url),
        pedidos: lineas.reduce((sum, line) => sum + line.pedido, 0),
        entregados: lineas.reduce((sum, line) => sum + (line.entregada ?? 0), 0),
        entregado,
        lineas,
        recaudo,
        abonado,
        abonosByProduct: approvedAbonosByProduct(member.abonos),
        ajusteParticipantes: Number(member.ajuste_participantes) || 0,
        pendiente: Math.max(0, recaudo - abonado),
        ganancia: saleGain(services, billed),
      },
    ]
  })
}

function rowProductLines(
  row: SummaryRow,
  services: EventParticipantService[],
  totales?: Record<number, number>,
) {
  return productGainLines(
    row.lineas.map((line) => ({
      id: line.id,
      nombre: line.nombre,
      qty: line.entregada == null ? line.pedido : line.entregada,
    })),
    services,
    totales,
  )
}

function sortRows(rows: SummaryRow[], sort: PeopleSort): SummaryRow[] {
  const byName = (a: SummaryRow, b: SummaryRow) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  return [...rows].sort((a, b) => {
    if (sort === 'cantidades') return b.pedidos - a.pedidos || byName(a, b)
    if (sort === 'entregados') return b.entregados - a.entregados || byName(a, b)
    if (sort === 'faltantes') return b.pendiente - a.pendiente || byName(a, b)
    return byName(a, b)
  })
}

function PersonCell({ row }: { row: SummaryRow }) {
  return (
    <span className="event-summary__who">
      <span className="event-summary__avatar" aria-hidden="true">
        {row.photo ? <img src={row.photo} alt="" /> : memberInitials(row.name)}
      </span>
      <strong>{row.name}</strong>
    </span>
  )
}

function DebtPill({ value, onPay }: { value: number; onPay?: () => void }) {
  if (value > 0 && onPay) {
    return (
      <button type="button" className="event-summary__pill is-danger" onClick={onPay}>
        {formatMoney(value)}
      </button>
    )
  }
  return value > 0 ? (
    <span className="event-summary__pill is-danger">{formatMoney(value)}</span>
  ) : (
    <span className="event-summary__pill is-ok">
      <AdminIcon name="check" />
      Al día
    </span>
  )
}

export function EventActivitySummary({
  members,
  services,
  draft,
  capital,
  gananciaConfigId,
  gananciaRegistro,
  eventName,
  canEntregar = false,
  onStartAbono,
  onDeliver,
}: EventActivitySummaryProps) {
  const [sort, setSort] = useState<PeopleSort>('nombre')
  const [openIds, setOpenIds] = useState<number[]>([])
  const [loadedIds, setLoadedIds] = useState<number[]>([])
  const [deliverId, setDeliverId] = useState<number | null>(null)
  const [deliverQty, setDeliverQty] = useState<Record<number, string>>({})
  const [delivering, setDelivering] = useState(false)
  const counts = participantEventCounts(members, services, draft)
  const totales = Object.fromEntries(counts.productos.map((product) => [product.id, product.unidades]))
  const proyeccion = counts.recaudo
  const ganancia = proyeccion - capital
  const rows = buildRows(members, services, draft)
  const ordered = sortRows(rows, sort)
  const porCobrar = ordered.reduce((sum, row) => sum + row.pendiente, 0)
  const capitalCubierto = rows.reduce(
    (sum, row) => sum + coveredCapitalFromLines(rowProductLines(row, services, totales), row.abonosByProduct),
    0,
  )
  const margen = proyeccion > 0 ? (ganancia / proyeccion) * 100 : 0
  const reparto = useIncomeReparto(gananciaConfigId)
  const received = reparto
    ? (() => {
        const parts = sumPaidIncomeParts(
          rows.map((row) => ({
            lines: rowProductLines(row, services, totales),
            abonosByProduct: row.abonosByProduct,
          })),
          reparto,
        )
        const extra = rows.reduce((sum, row) => sum + row.ajusteParticipantes, 0)
        if (extra) parts.miembros = (parts.miembros ?? 0) + extra
        return parts
      })()
    : undefined
  const snapshot = liveGainSnapshot(proyeccion, capital, reparto)
  const diezmoPrevisto = reparto ? snapshot.diezmo : Number(gananciaRegistro?.diezmo) || 0
  const ofrendaPrevista = reparto ? snapshot.ofrenda : Number(gananciaRegistro?.ofrenda) || 0
  const gananciaDespues = ganancia - diezmoPrevisto - ofrendaPrevista
  const restoPrevisto = reparto ? snapshot.resto : Number(gananciaRegistro?.resto) || 0
  const participantesReparto = reparto ? snapshot.participantes : Number(gananciaRegistro?.participantes) || 0
  const clubReparto = reparto ? snapshot.club : Number(gananciaRegistro?.club) || 0
  const otrosReparto = reparto ? snapshot.extras : Number(gananciaRegistro?.extras) || 0
  const partePct = (parte: number) => (restoPrevisto > 0 ? Math.round((parte / restoPrevisto) * 100) : 0)
  const unitGains = productGainLines(
    counts.productos.map((product) => ({ id: product.id, nombre: product.nombre, qty: 1 })),
    services,
    totales,
  ).map((line) => ({
    ...line,
    gananciaUnidad: reparto ? participantShare(reparto, line.gananciaUnidad) : line.gananciaUnidad,
  }))
  const deliverRow = ordered.find((row) => row.id === deliverId) ?? null

  function openDeliver(row: SummaryRow) {
    setDeliverQty(
      Object.fromEntries(row.lineas.map((line) => [line.id, String(line.entregada ?? line.pedido)])),
    )
    setDeliverId(row.id)
  }

  async function confirmDeliver() {
    if (!deliverRow || !onDeliver || delivering) return
    const ventas = deliverRow.lineas.map((line) => ({
      producto_servicio_id: line.id,
      cantidad_entregada: Math.max(0, Math.floor(Number(deliverQty[line.id]) || 0)),
    }))
    setDelivering(true)
    try {
      await onDeliver(deliverRow.id, ventas)
      setDeliverId(null)
    } finally {
      setDelivering(false)
    }
  }

  function exportRows() {
    downloadCsv(`ganancias-${eventName || 'actividad'}`, [
      ['#', 'Participante', 'Pedidos', 'Entregados', 'Aporte estimado', 'Pagado', 'Falta por cobrar', 'Ganancia real', 'Ganancia estimada'],
      ...ordered.map((row, index) => {
        const lines = rowProductLines(row, services, totales)
        const prevista = participantGainFromLines(lines, reparto)
        return [
          index + 1,
          row.name,
          row.pedidos,
          row.entregado ? row.entregados : '',
          row.recaudo,
          row.abonado,
          row.pendiente,
          participantGainFromPaidLines(lines, row.abonosByProduct, reparto, row.ajusteParticipantes),
          prevista,
        ]
      }),
    ])
  }

  return (
    <div className="event-summary">
      <section className="event-summary__block event-summary__block--hero">
        <header className="event-summary__head">
          <SummaryIcon name="chart" tone="gold" />
          <h3>Resumen de la actividad</h3>
          {eventName ? (
            <span className="event-summary__chip">
              <AdminIcon name="calendar" />
              {eventName}
            </span>
          ) : null}
        </header>

        <div className="event-summary__kpis">
          <article className="event-summary__kpi is-cost">
            <SummaryIcon name="wallet" tone="danger" />
            <p>
              <span>Capital (costos del evento)</span>
              <strong>{formatMoney(capital)}</strong>
            </p>
            <span className="event-summary__sheet-fill">
              <strong className="is-real">{formatMoney(capitalCubierto)}</strong>
              <ProgressBar value={percent(capitalCubierto, capital)} />
              <small className="is-previsto">Cubierto</small>
            </span>
          </article>
          <article className="event-summary__kpi is-highlight">
            <SummaryIcon name="coins" tone="gold" />
            <p>
              <span>Ganancia prevista</span>
              <strong>{formatMoney(ganancia)}</strong>
            </p>
          </article>
          <article className="event-summary__kpi">
            <SummaryIcon name="coins" tone="info" />
            <p>
              <span>Diezmo y ofrenda previstos</span>
              <strong>{formatMoney(diezmoPrevisto + ofrendaPrevista)}</strong>
            </p>
            <ul className="event-summary__pair">
              <li>
                <span>Diezmo</span>
                <strong>{formatMoney(diezmoPrevisto)}</strong>
              </li>
              <li>
                <span>Ofrenda</span>
                <strong>{formatMoney(ofrendaPrevista)}</strong>
              </li>
            </ul>
          </article>
          <article className="event-summary__kpi is-span">
            <SummaryIcon name="chart" tone="ok" />
            <p>
              <span>Ganancia después de diezmo y ofrenda</span>
              <strong>{formatMoney(gananciaDespues)}</strong>
            </p>
          </article>
          {restoPrevisto > 0 ? (
            <div className="event-summary__beside">
              {(reparto ? reparto.miembros : participantesReparto) > 0 ? (
                <article className="event-summary__kpi">
                  <SummaryIcon name="group" tone="ok" />
                  <p>
                    <span>Participantes {partePct(participantesReparto)}%</span>
                    <strong>{formatMoney(participantesReparto)}</strong>
                  </p>
                </article>
              ) : null}
              {(reparto ? reparto.club : clubReparto) > 0 ? (
                <article className="event-summary__kpi">
                  <SummaryIcon name="building" tone="info" />
                  <p>
                    <span>Club {partePct(clubReparto)}%</span>
                    <strong>{formatMoney(clubReparto)}</strong>
                  </p>
                </article>
              ) : null}
              {(reparto ? reparto.extras : otrosReparto) > 0 ? (
                <article className="event-summary__kpi">
                  <SummaryIcon name="tags" tone="gold" />
                  <p>
                    <span>Otros {partePct(otrosReparto)}%</span>
                    <strong>{formatMoney(otrosReparto)}</strong>
                  </p>
                </article>
              ) : null}
            </div>
          ) : null}
          <article className="event-summary__kpi">
            <SummaryIcon name="pie" tone="info" />
            <p>
              <span>Margen estimado</span>
              <strong>{margen.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%</strong>
            </p>
            {unitGains.length ? (
              <ul className="event-summary__units">
                {unitGains.map((line) => (
                  <li key={line.id}>
                    <span>{line.nombre}</span>
                    <strong>{formatMoney(line.gananciaUnidad)}</strong>
                    <small>por unidad</small>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        </div>

        {ganancia < 0 ? (
          <p className="app-panel__hint">El capital supera la proyección. La actividad todavía no deja ganancia.</p>
        ) : null}
      </section>

      <section className="event-summary__block">
        <header className="event-summary__head">
          <SummaryIcon name="users" tone="gold" />
          <h3>Ganancia por participante</h3>
          <strong className="event-summary__total event-summary__total--faltante" aria-label={`Falta por cobrar ${formatMoney(porCobrar)}`}>
            <AdminIcon name="target" />
            <span>{formatMoney(porCobrar)}</span>
          </strong>
          {rows.length ? (
            <div className="event-summary__tools">
              <label className="event-summary__sort">
                Ordenar
                <select value={sort} onChange={(event) => setSort(event.target.value as PeopleSort)}>
                  <option value="nombre">Nombre</option>
                  <option value="cantidades">Cantidades</option>
                  <option value="entregados">Entregados</option>
                  <option value="faltantes">Faltantes por cobrar</option>
                </select>
              </label>
              <button type="button" className="app-panel__btn--ghost event-summary__export" onClick={exportRows}>
                <AdminIcon name="download" />
                <span>Exportar</span>
              </button>
            </div>
          ) : null}
        </header>
        {rows.length === 0 ? (
          <p className="app-panel__muted">Nadie está marcado como participante.</p>
        ) : (
          <div className="event-summary__table event-summary__table--people" role="table">
            <div className="event-summary__row is-head" role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">Participante</span>
              <span role="columnheader">Pedidos</span>
              <span role="columnheader">Aporte estimado</span>
              <span role="columnheader">Pagado</span>
              <span role="columnheader">Falta por cobrar</span>
              <span role="columnheader">Ganancia</span>
            </div>
            {ordered.map((row, index) => {
              const paid = percent(row.abonado, row.recaudo)
              const productLines = rowProductLines(row, services, totales)
              const gananciaPrevista = participantGainFromLines(productLines, reparto)
              const gananciaReal = participantGainFromPaidLines(
                productLines,
                row.abonosByProduct,
                reparto,
                row.ajusteParticipantes,
              )
              const avance = percent(gananciaReal, gananciaPrevista)
              return (
                <div key={row.id} className={`event-summary__person${openIds.includes(row.id) ? ' is-open' : ''}`}>
                <div className="event-summary__row" role="row">
                  <span className="event-summary__num" role="cell">{index + 1}</span>
                  <span className="event-summary__cell is-who" role="cell">
                    <PersonCell row={row} />
                    <button
                      type="button"
                      className="event-summary__fold"
                      aria-expanded={openIds.includes(row.id)}
                      aria-label={`Reparto del abono de ${row.name}`}
                      onClick={() => {
                        setLoadedIds((current) => (current.includes(row.id) ? current : [...current, row.id]))
                        setOpenIds((current) =>
                          current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id],
                        )
                      }}
                    >
                      <AdminIcon name="chevronRight" />
                    </button>
                  </span>
                  <span className="event-summary__cell is-pedidos" role="cell">
                    <small>Pedidos</small>
                    <strong>{row.pedidos}</strong>
                    {row.entregado ? (
                      <em>
                        Entregados {row.entregados}
                        {canEntregar && onDeliver ? (
                          <button
                            type="button"
                            className="event-summary__edit"
                            aria-label={`Actualizar entrega de ${row.name}`}
                            onClick={() => openDeliver(row)}
                          >
                            <AdminIcon name="pencil" />
                          </button>
                        ) : null}
                      </em>
                    ) : null}
                  </span>
                  <span className="event-summary__cell is-aporte" role="cell">
                    <small>Aporte</small>
                    <strong>{formatMoney(row.recaudo)}</strong>
                  </span>
                  <span className="event-summary__cell is-pagado" role="cell">
                    <small>Pagado</small>
                    <strong>{formatMoney(row.abonado)}</strong>
                    {row.entregado ? (
                      <span className="event-summary__paid">
                        <ProgressBar value={paid} />
                        <small>{paid}%</small>
                      </span>
                    ) : null}
                    {canEntregar && !row.entregado && row.lineas.length > 0 && onDeliver ? (
                      <button type="button" className="app-panel__btn--ghost event-summary__deliver" onClick={() => openDeliver(row)}>
                        Entregar
                      </button>
                    ) : null}
                  </span>
                  <span className="event-summary__cell is-falta" role="cell">
                    <small>Falta por cobrar</small>
                    <DebtPill
                      value={row.pendiente}
                      onPay={onStartAbono && row.pendiente > 0 ? () => onStartAbono(row.id) : undefined}
                    />
                  </span>
                  <span className="event-summary__cell is-ganancia" role="cell">
                    <small>Ganancia real</small>
                    <strong>{formatMoney(gananciaReal)}</strong>
                    <span className="event-summary__paid">
                      <ProgressBar value={avance} />
                      <small>{formatMoney(gananciaPrevista)}</small>
                    </span>
                  </span>
                </div>
                {loadedIds.includes(row.id) ? (
                  <div hidden={!openIds.includes(row.id)}>
                  <ParticipantIncomeSplit
                    configId={gananciaConfigId}
                    ingreso={row.abonado}
                    abonosByProduct={row.abonosByProduct}
                    lines={productLines}
                    ajusteParticipantes={row.ajusteParticipantes}
                  />
                  </div>
                ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="event-summary__block">
        <EventGainDistribution
          configId={gananciaConfigId}
          registro={reparto ? snapshot : gananciaRegistro}
          received={received}
        />
      </section>

      {deliverRow ? (
        <div className="attendance-confirm" role="dialog" aria-modal="true" aria-labelledby="summary-deliver-title">
          <button
            type="button"
            className="attendance-confirm__backdrop"
            aria-label="Cancelar"
            disabled={delivering}
            onClick={() => setDeliverId(null)}
          />
          <AppPanel className="attendance-confirm__panel" shine={false}>
            <p className="app-panel__kicker">Entrega</p>
            <h2 className="app-panel__title" id="summary-deliver-title">
              {deliverRow.name}
            </h2>
            <p className="app-panel__subtitle">
              Pedidos: {deliverRow.pedidos}. Lo entregado puede ser mayor. Esa cifra es la real: con ella se calculan el cobro, lo pendiente y la ganancia.
            </p>
            <div className="attendance-deliver">
              {deliverRow.lineas.map((line) => (
                <label key={line.id}>
                  {line.nombre}
                  <small>Pedido {line.pedido}</small>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    disabled={delivering}
                    value={deliverQty[line.id] ?? ''}
                    onChange={(event) =>
                      setDeliverQty((current) => ({ ...current, [line.id]: event.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="attendance-confirm__actions">
              <button type="button" className="app-panel__btn--ghost" disabled={delivering} onClick={() => setDeliverId(null)}>
                Cancelar
              </button>
              <button type="button" className="app-panel__btn--primary" disabled={delivering} onClick={() => void confirmDeliver()}>
                {delivering ? 'Guardando…' : 'Confirmar entrega'}
              </button>
            </div>
          </AppPanel>
        </div>
      ) : null}
    </div>
  )
}
