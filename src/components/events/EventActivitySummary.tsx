import { AdminIcon } from '../../admin/AdminIcon'
import { resolveFileUrl } from '../../api/baseUrl'
import type { EventParticipant, EventParticipantService } from '../../api/types'
import { downloadCsv } from '../../theme/csv'
import { memberInitials } from '../attendance/AttendanceMarkList'
import { saleTotals, type ParticipantDraft } from './ParticipantsMarkList'
import { ProgressBar, SummaryIcon, summaryPercent as percent } from './SummaryCards'

type EventActivitySummaryProps = {
  members: EventParticipant[]
  services: EventParticipantService[]
  draft: ParticipantDraft
  capital: number
  eventName?: string
}

type SummaryRow = {
  id: number
  name: string
  photo: string | null
  recaudo: number
  abonado: number
  pendiente: number
  ganancia: number
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function splitByWeight(total: number, weights: number[]): number[] {
  if (weights.length === 0) return []
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  if (weightSum <= 0) {
    const each = Math.round(total / weights.length)
    const shares = weights.map(() => each)
    shares[shares.length - 1] = total - each * (weights.length - 1)
    return shares
  }
  const shares = weights.map((weight) => Math.round((total * weight) / weightSum))
  shares[shares.length - 1] += total - shares.reduce((sum, share) => sum + share, 0)
  return shares
}

function buildRows(
  members: EventParticipant[],
  services: EventParticipantService[],
  draft: ParticipantDraft,
  ganancia: number,
): SummaryRow[] {
  const participants = members.flatMap((member) => {
    const current = draft[member.persona_id]
    if (current?.participa !== true) return []
    const recaudo = saleTotals(services, current.ventas).recaudo
    const abonado = Number(member.abonado) || 0
    return [
      {
        id: member.persona_id,
        name: member.full_name,
        photo: resolveFileUrl(member.foto_url),
        recaudo,
        abonado,
        pendiente: Math.max(0, recaudo - abonado),
      },
    ]
  })
  const shares = splitByWeight(
    ganancia,
    participants.map((row) => row.recaudo),
  )
  return participants
    .map((row, index) => ({ ...row, ganancia: shares[index] ?? 0 }))
    .sort((a, b) => b.pendiente - a.pendiente || a.name.localeCompare(b.name, 'es'))
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

function DebtPill({ value }: { value: number }) {
  return value > 0 ? (
    <span className="event-summary__pill is-danger">{formatMoney(value)}</span>
  ) : (
    <span className="event-summary__pill is-ok">
      <AdminIcon name="check" />
      Al día
    </span>
  )
}

export function EventActivitySummary({ members, services, draft, capital, eventName }: EventActivitySummaryProps) {
  const proyeccion = members.reduce((sum, member) => {
    const current = draft[member.persona_id]
    return current?.participa === true ? sum + saleTotals(services, current.ventas).recaudo : sum
  }, 0)
  const ganancia = proyeccion - capital
  const rows = buildRows(members, services, draft, ganancia)
  const deudores = rows.filter((row) => row.pendiente > 0)
  const porCobrar = deudores.reduce((sum, row) => sum + row.pendiente, 0)
  const margen = proyeccion > 0 ? (ganancia / proyeccion) * 100 : 0

  function exportRows() {
    downloadCsv(`ganancias-${eventName || 'actividad'}`, [
      ['#', 'Participante', 'Aporte estimado', 'Pagado', 'Falta por cobrar', 'Ganancia estimada'],
      ...rows.map((row, index) => [index + 1, row.name, row.recaudo, row.abonado, row.pendiente, row.ganancia]),
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
            <button type="button" className="app-panel__btn--ghost event-summary__export" onClick={exportRows}>
              <AdminIcon name="download" />
              <span>Exportar</span>
            </button>
          ) : null}
        </header>
        {rows.length === 0 ? (
          <p className="app-panel__muted">Nadie está marcado como participante.</p>
        ) : (
          <div className="event-summary__table event-summary__table--people" role="table">
            <div className="event-summary__row is-head" role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">Participante</span>
              <span role="columnheader">Aporte estimado</span>
              <span role="columnheader">Pagado</span>
              <span role="columnheader">Falta por cobrar</span>
              <span role="columnheader">Ganancia estimada</span>
            </div>
            {rows.map((row, index) => {
              const paid = percent(row.abonado, row.recaudo)
              return (
                <div key={row.id} className="event-summary__row" role="row">
                  <span className="event-summary__num" role="cell">{index + 1}</span>
                  <span className="event-summary__cell is-who" role="cell">
                    <PersonCell row={row} />
                  </span>
                  <span className="event-summary__cell is-aporte" role="cell">
                    <small>Aporte</small>
                    <strong>{formatMoney(row.recaudo)}</strong>
                  </span>
                  <span className="event-summary__cell is-pagado" role="cell">
                    <small>Pagado</small>
                    <strong>{formatMoney(row.abonado)}</strong>
                    <span className="event-summary__paid">
                      <ProgressBar value={paid} />
                      <small>{paid}%</small>
                    </span>
                  </span>
                  <span className="event-summary__cell is-falta" role="cell">
                    <small>Falta por cobrar</small>
                    <DebtPill value={row.pendiente} />
                  </span>
                  <span className="event-summary__cell is-ganancia" role="cell">
                    <span className="event-summary__pill is-gold">
                      {formatMoney(row.ganancia)}
                      <small>Ganancia</small>
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="event-summary__block event-summary__block--debt">
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
                  <DebtPill value={row.pendiente} />
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
