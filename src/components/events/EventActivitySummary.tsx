import { useState } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import { resolveFileUrl } from '../../api/baseUrl'
import type { EventParticipant, EventParticipantService } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'
import { downloadCsv } from '../../theme/csv'
import { memberInitials } from '../attendance/AttendanceMarkList'
import type { EventoGananciaRegistro } from '../../api/types'
import { EventGainDistribution } from './EventGananciasPanel'
import { saleGain, saleTotals, type ParticipantDraft } from './ParticipantsMarkList'
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
        pendiente: Math.max(0, recaudo - abonado),
        ganancia: saleGain(services, billed),
      },
    ]
  })
}

function memberGain(row: Pick<SummaryRow, 'ganancia' | 'recaudo' | 'abonado'>): number {
  if (row.recaudo <= 0 || row.ganancia <= 0) return 0
  const cobertura = Math.min(row.recaudo, Math.max(0, row.abonado)) / row.recaudo
  return Math.round(row.ganancia * cobertura)
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
  const [deliverId, setDeliverId] = useState<number | null>(null)
  const [deliverQty, setDeliverQty] = useState<Record<number, string>>({})
  const [delivering, setDelivering] = useState(false)
  const proyeccion = members.reduce((sum, member) => {
    const current = draft[member.persona_id]
    if (current?.participa !== true) return sum
    const lineas = orderLines(member, services, draft)
    const billed = Object.fromEntries(
      lineas.map((line) => [line.id, line.entregada == null ? line.pedido : line.entregada]),
    )
    return sum + saleTotals(services, billed).recaudo
  }, 0)
  const ganancia = proyeccion - capital
  const rows = buildRows(members, services, draft)
  const ordered = sortRows(rows, sort)
  const deudores = ordered.filter((row) => row.pendiente > 0)
  const porCobrar = deudores.reduce((sum, row) => sum + row.pendiente, 0)
  const margen = proyeccion > 0 ? (ganancia / proyeccion) * 100 : 0
  const gananciaParticipantes = rows.reduce((sum, row) => sum + row.ganancia, 0)
  const proyectadoParticipantes = Number(gananciaRegistro?.participantes) || 0
  const cobrado = proyectadoParticipantes > 0 ? gananciaParticipantes / proyectadoParticipantes : 0
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
      ['#', 'Participante', 'Pedidos', 'Entregados', 'Aporte estimado', 'Pagado', 'Falta por cobrar', 'Ganancia', 'Ganancia estimada'],
      ...ordered.map((row, index) => [
        index + 1,
        row.name,
        row.pedidos,
        row.entregado ? row.entregados : '',
        row.recaudo,
        row.abonado,
        row.pendiente,
        memberGain(row),
        row.ganancia,
      ]),
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
          <article className="event-summary__kpi is-highlight">
            <SummaryIcon name="coins" tone="gold" />
            <p>
              <span>Ganancia prevista</span>
              <strong>{formatMoney(ganancia)}</strong>
            </p>
          </article>
          <article className="event-summary__kpi">
            <SummaryIcon name="wallet" tone="gold" />
            <p>
              <span>Capital (costos del evento)</span>
              <strong>{formatMoney(capital)}</strong>
            </p>
          </article>
          <article className="event-summary__kpi">
            <SummaryIcon name="pie" tone="info" />
            <p>
              <span>Margen estimado</span>
              <strong>{margen.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%</strong>
            </p>
            {services.length ? (
              <ul className="event-summary__units">
                {services.map((service) => (
                  <li key={service.id}>
                    <span>{service.nombre}</span>
                    <strong>{formatMoney(Number(service.ganancia_unidad) || 0)}</strong>
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
              const gananciaReal = memberGain(row)
              const avance = percent(gananciaReal, row.ganancia)
              return (
                <div key={row.id} className="event-summary__row" role="row">
                  <span className="event-summary__num" role="cell">{index + 1}</span>
                  <span className="event-summary__cell is-who" role="cell">
                    <PersonCell row={row} />
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
                    <small>Ganancia</small>
                    <strong>{formatMoney(gananciaReal)}</strong>
                    <span className="event-summary__paid">
                      <ProgressBar value={avance} />
                      <small>{formatMoney(row.ganancia)}</small>
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="event-summary__block event-summary__block--debt">
        <EventGainDistribution configId={gananciaConfigId} registro={gananciaRegistro} cobrado={cobrado} />
        <header className="event-summary__head">
          <SummaryIcon name="alert" tone="danger" />
          <h3>Falta por cobrar</h3>
          <strong className="event-summary__total">{formatMoney(porCobrar)}</strong>
        </header>
        {deudores.length === 0 ? (
          <p className="app-panel__muted">Nadie tiene saldo pendiente.</p>
        ) : (
          <div className="event-summary__table event-summary__table--debt" role="table">
            <div className="event-summary__row is-head" role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">Participante</span>
              <span role="columnheader">Aporte estimado</span>
              <span role="columnheader">Pagado</span>
              <span role="columnheader">Falta por cobrar</span>
            </div>
            {deudores.map((row, index) => (
              <div key={row.id} className="event-summary__row" role="row">
                <span className="event-summary__num" role="cell">{index + 1}</span>
                <span className="event-summary__cell is-who" role="cell">
                  <strong>{row.name}</strong>
                </span>
                <span className="event-summary__cell is-aporte" role="cell">
                  <small>Aporte</small>
                  <strong>{formatMoney(row.recaudo)}</strong>
                </span>
                <span className="event-summary__cell is-pagado" role="cell">
                  <small>Pagado</small>
                  <strong>{formatMoney(row.abonado)}</strong>
                </span>
                <span className="event-summary__cell is-falta" role="cell">
                  <DebtPill
                    value={row.pendiente}
                    onPay={onStartAbono && row.pendiente > 0 ? () => onStartAbono(row.id) : undefined}
                  />
                </span>
              </div>
            ))}
          </div>
        )}
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
