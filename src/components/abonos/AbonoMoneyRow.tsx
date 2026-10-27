import { AdminIcon } from '../../admin/AdminIcon'

function formatPrice(value: number): string {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export function AbonoMoneyRow({
  comprometido,
  abonado,
  pendiente,
}: {
  comprometido: number
  abonado: number
  pendiente: number
}) {
  const showPendiente = pendiente > 0

  return (
    <div className={`abonos-deal__money${showPendiente ? '' : ' is-settled'}`}>
      <p className="event-countdown__cell">
        <span className="abonos-deal__money-icon" data-tone="hint">
          <AdminIcon name="calculator" />
        </span>
        <strong>{formatPrice(comprometido)}</strong>
        <span>Comprometido</span>
      </p>
      <p className="event-countdown__cell is-paid">
        <span className="abonos-deal__money-icon" data-tone="ok">
          <AdminIcon name="check" />
        </span>
        <strong>{formatPrice(abonado)}</strong>
        <span>Abonado</span>
      </p>
      {showPendiente ? (
        <p className="event-countdown__cell is-debt">
          <span className="abonos-deal__money-icon" data-tone="alert">
            <AdminIcon name="hourglass" />
          </span>
          <strong>{formatPrice(pendiente)}</strong>
          <span>Pendiente</span>
        </p>
      ) : null}
    </div>
  )
}
