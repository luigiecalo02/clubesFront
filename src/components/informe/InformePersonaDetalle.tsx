import { resolveFileUrl } from '../../api/baseUrl'
import type { InformeActividadLinea, InformeParticipanteDetalle, InformeProductoLinea } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'

const COLORS = ['#3b82f6', '#eab308', '#14b8a6', '#a855f7', '#ec4899', '#84cc16', '#38bdf8', '#f97316']

function formatMoney(value: number): string {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const from = polar(cx, cy, r, start)
  const to = polar(cx, cy, r, end)
  const large = end - start > 180 ? 1 : 0
  return `M ${from.x} ${from.y} A ${r} ${r} 0 ${large} 1 ${to.x} ${to.y}`
}

export function InformePersonaDetalle({
  detail,
  openActividad,
  onToggleActividad,
}: {
  detail: InformeParticipanteDetalle
  openActividad: Record<string, boolean>
  onToggleActividad: (eventoKey: string) => void
}) {
  const total = detail.total > 0 ? detail.total : detail.actividades.reduce((sum, row) => sum + row.total, 0)
  const slices = detail.actividades.map((actividad, index) => ({
    id: actividad.evento_id ?? index,
    nombre: actividad.nombre,
    total: actividad.total,
    percent: total > 0 ? (actividad.total / total) * 100 : 0,
    color: COLORS[index % COLORS.length],
  }))

  if (detail.actividades.length === 0) {
    return <p className="app-panel__hint">Sin actividades en el periodo.</p>
  }

  return (
    <div className="informe-detalle">
      <section className="informe-detalle__disc">
        <h3 className="informe-detalle__title">Discriminación por actividad</h3>
        <div className="informe-detalle__table" role="table" aria-label="Discriminación por actividad">
          <div className="informe-detalle__head" role="row">
            <span role="columnheader">Actividad / Producto</span>
            <span role="columnheader">Cantidad</span>
            <span role="columnheader">Participación</span>
            <span role="columnheader">Ganancia</span>
          </div>
          {detail.actividades.map((actividad, index) => {
            const eventoKey = String(actividad.evento_id ?? actividad.nombre)
            const open = Boolean(openActividad[eventoKey])
            const pct = total > 0 ? (actividad.total / total) * 100 : 0
            const qty = actividad.productos.reduce((sum, row) => sum + (row.cantidad ?? 0), 0)
            return (
              <ActividadRows
                key={`${actividad.evento_id ?? actividad.nombre}-${index}`}
                actividad={actividad}
                open={open}
                pct={pct}
                qty={qty || null}
                color={COLORS[index % COLORS.length]}
                personTotal={total}
                onToggle={() => onToggleActividad(eventoKey)}
              />
            )
          })}
        </div>
      </section>

      <section className="informe-detalle__dist">
        <h3 className="informe-detalle__title">Distribución de la ganancia</h3>
        <div className="informe-detalle__dist-body">
          <PersonaDonut slices={slices} total={total} />
          <ul className="informe-detalle__legend">
            {slices.map((slice) => (
              <li key={slice.id}>
                <span className="informe-detalle__swatch" style={{ background: slice.color }} />
                <span className="informe-detalle__legend-name">{slice.nombre}</span>
                <strong>{formatMoney(slice.total)}</strong>
                <span className="informe-detalle__legend-pct">{formatPct(slice.percent)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

function ActividadRows({
  actividad,
  open,
  pct,
  qty,
  color,
  personTotal,
  onToggle,
}: {
  actividad: InformeActividadLinea
  open: boolean
  pct: number
  qty: number | null
  color: string
  personTotal: number
  onToggle: () => void
}) {
  return (
    <div className={`informe-detalle__group${open ? ' is-open' : ''}`}>
      <button type="button" className="informe-detalle__row is-activity" onClick={onToggle} aria-expanded={open}>
        <span className="informe-detalle__cell is-name">
          <span className="informe-detalle__caret" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
          <span className="informe-detalle__dot" style={{ background: color }} aria-hidden />
          <strong>{actividad.nombre}</strong>
        </span>
        <span className="informe-detalle__cell is-qty">{qty != null && qty > 0 ? qty : '—'}</span>
        <span className="informe-detalle__cell is-pct">{formatPct(pct)}</span>
        <span className="informe-detalle__cell is-gain">
          <strong>{formatMoney(actividad.total)}</strong>
          <span className="informe-detalle__row-chevron" aria-hidden>
            {open ? '▴' : '▸'}
          </span>
        </span>
      </button>
      {open
        ? actividad.productos.map((producto, index) => (
            <ProductoRow
              key={`${producto.producto_servicio_id ?? producto.nombre}-${index}`}
              producto={producto}
              personTotal={personTotal}
            />
          ))
        : null}
    </div>
  )
}

function ProductoRow({ producto, personTotal }: { producto: InformeProductoLinea; personTotal: number }) {
  const image = resolveFileUrl(producto.image_url)
  const pct = personTotal > 0 ? (producto.ganancia / personTotal) * 100 : 0

  return (
    <div className="informe-detalle__row is-product">
      <span className="informe-detalle__cell is-name">
        <span className="informe-detalle__product-icon" aria-hidden>
          {image ? <img src={image} alt="" /> : <AdminIcon name="box" />}
        </span>
        <span>{producto.nombre}</span>
      </span>
      <span className="informe-detalle__cell is-qty">
        {producto.cantidad != null ? producto.cantidad : '—'}
      </span>
      <span className="informe-detalle__cell is-pct">{formatPct(pct)}</span>
      <span className="informe-detalle__cell is-gain is-product-gain">{formatMoney(producto.ganancia)}</span>
    </div>
  )
}

function PersonaDonut({
  slices,
  total,
}: {
  slices: Array<{ id: number | string; nombre: string; total: number; percent: number; color: string }>
  total: number
}) {
  const cx = 90
  const cy = 90
  const r = 58
  let angle = 0
  const arcs = slices
    .filter((slice) => slice.percent > 0)
    .map((slice) => {
      const sweep = Math.max(1.2, (slice.percent / 100) * 360)
      const start = angle
      const end = angle + sweep
      angle = end
      return { ...slice, start, end }
    })

  return (
    <svg className="informe-detalle__donut" viewBox="0 0 180 180" role="img" aria-label="Distribución de la ganancia">
      {arcs.length === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="color-mix(in srgb, #fff 18%, transparent)" strokeWidth="26" />
      ) : (
        arcs.map((slice) => (
          <path
            key={slice.id}
            d={arcPath(cx, cy, r, slice.start, slice.end)}
            fill="none"
            stroke={slice.color}
            strokeWidth="26"
          />
        ))
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" className="informe-detalle__donut-total">
        {formatMoney(total)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="informe-detalle__donut-caption">
        Total
      </text>
    </svg>
  )
}
