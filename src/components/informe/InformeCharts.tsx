import type { InformeParticipanteResumen } from '../../api/types'

const COLORS = ['#3b82f6', '#14b8a6', '#eab308', '#a855f7', '#ec4899', '#84cc16', '#38bdf8', '#f97316', '#22d3ee']

function formatMoney(value: number): string {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function shortName(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return nombre
  return `${parts[0]} ${parts[1][0]}.`
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

export type InformeChartSlice = {
  id: number
  nombre: string
  total: number
  percent: number
  color: string
}

export function buildInformeSlices(participantes: InformeParticipanteResumen[], total: number): InformeChartSlice[] {
  const base = total > 0 ? total : participantes.reduce((sum, row) => sum + row.total, 0)
  return participantes.map((row, index) => ({
    id: row.persona_id,
    nombre: row.nombre,
    total: row.total,
    percent: base > 0 ? (row.total / base) * 100 : 0,
    color: COLORS[index % COLORS.length],
  }))
}

export function InformeCharts({
  participantes,
  total,
}: {
  participantes: InformeParticipanteResumen[]
  total: number
}) {
  const slices = buildInformeSlices(participantes, total)
  if (slices.length === 0) {
    return <p className="app-panel__hint">No hay datos para graficar en este periodo.</p>
  }

  return (
    <div className="informe-charts">
      <DonutCard slices={slices} total={total} />
      <BarsCard slices={slices} />
    </div>
  )
}

function DonutCard({ slices, total }: { slices: InformeChartSlice[]; total: number }) {
  const cx = 120
  const cy = 120
  const r = 78
  let angle = 0
  const arcs = slices
    .filter((slice) => slice.percent > 0)
    .map((slice) => {
      const sweep = Math.max(0.8, (slice.percent / 100) * 360)
      const start = angle
      const end = angle + sweep
      angle = end
      const mid = start + sweep / 2
      const label = polar(cx, cy, r, mid)
      return { ...slice, start, end, label }
    })

  return (
    <article className="informe-charts__card">
      <h2 className="informe-charts__title">Distribución de ganancias</h2>
      <div className="informe-charts__donut-wrap">
        <svg className="informe-charts__donut" viewBox="0 0 240 240" role="img" aria-label="Distribución de ganancias">
          {arcs.map((slice) => (
            <path
              key={slice.id}
              d={arcPath(cx, cy, r, slice.start, slice.end)}
              fill="none"
              stroke={slice.color}
              strokeWidth="34"
              strokeLinecap="butt"
            />
          ))}
          {arcs.map((slice) =>
            slice.percent >= 6 ? (
              <text
                key={`label-${slice.id}`}
                x={slice.label.x}
                y={slice.label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="informe-charts__donut-pct"
              >
                {slice.percent.toFixed(1)}%
              </text>
            ) : null,
          )}
          <text x={cx} y={cy - 6} textAnchor="middle" className="informe-charts__donut-total">
            {formatMoney(total)}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" className="informe-charts__donut-caption">
            Total
          </text>
        </svg>
        <ul className="informe-charts__legend">
          {slices.map((slice) => (
            <li key={slice.id}>
              <span className="informe-charts__swatch" style={{ background: slice.color }} />
              <span className="informe-charts__legend-name">{slice.nombre}</span>
              <span className="informe-charts__legend-pct">{slice.percent.toFixed(1)}%</span>
              <strong>{formatMoney(slice.total)}</strong>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

function BarsCard({ slices }: { slices: InformeChartSlice[] }) {
  const max = Math.max(...slices.map((slice) => slice.total), 1)
  const niceMax = Math.ceil(max / 100000) * 100000 || 100000
  const width = 520
  const height = 280
  const padL = 58
  const padR = 16
  const padT = 28
  const padB = 48
  const chartW = width - padL - padR
  const chartH = height - padT - padB
  const gap = 12
  const barW = Math.min(42, (chartW - gap * (slices.length - 1)) / slices.length)
  const ticks = 5

  return (
    <article className="informe-charts__card">
      <h2 className="informe-charts__title">Ganancia por participante</h2>
      <svg className="informe-charts__bars" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ganancia por participante">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const value = (niceMax / ticks) * i
          const y = padT + chartH - (value / niceMax) * chartH
          return (
            <g key={value}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} className="informe-charts__grid" />
              <text x={padL - 8} y={y + 3} textAnchor="end" className="informe-charts__axis">
                {formatMoney(value)}
              </text>
            </g>
          )
        })}
        {slices.map((slice, index) => {
          const x = padL + index * (barW + gap) + (chartW - slices.length * barW - (slices.length - 1) * gap) / 2
          const h = (slice.total / niceMax) * chartH
          const y = padT + chartH - h
          return (
            <g key={slice.id}>
              <defs>
                <linearGradient id={`bar-${slice.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={slice.color} stopOpacity="1" />
                  <stop offset="100%" stopColor={slice.color} stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx="8" fill={`url(#bar-${slice.id})`} />
              <text x={x + barW / 2} y={y - 8} textAnchor="middle" className="informe-charts__bar-value">
                {formatMoney(slice.total)}
              </text>
              <text x={x + barW / 2} y={height - 16} textAnchor="middle" className="informe-charts__bar-name">
                {shortName(slice.nombre)}
              </text>
            </g>
          )
        })}
      </svg>
    </article>
  )
}
