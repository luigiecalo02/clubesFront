import type { CSSProperties } from 'react'
import type { AttendanceRankRow, AttendanceRanking } from '../../api/types'
import { memberInitials } from './AttendanceMarkList'
import '../../theme/attendance-mark.css'
import '../../theme/attendance-rank.css'

type AttendanceRankListProps = {
  ranking: AttendanceRanking | null
  loading?: boolean
}

function bestIds(rows: AttendanceRankRow[]): Set<number> {
  const top = Math.max(0, ...rows.map((row) => row.porcentaje))
  if (top <= 0) return new Set()
  return new Set(rows.filter((row) => row.porcentaje === top).map((row) => row.persona_id))
}

export function AttendanceRankList({ ranking, loading = false }: AttendanceRankListProps) {
  const rows = ranking?.integrantes ?? []
  const best = bestIds(rows)
  const eventos = ranking?.eventos ?? 0

  return (
    <div className="attendance-rank">
      {loading ? <p className="app-panel__muted">Cargando resumen…</p> : null}

      {!loading && eventos === 0 ? (
        <p className="app-panel__muted">
          Todavía no hay asistencia registrada. Cuando marques un evento, aquí verás el ranking.
        </p>
      ) : null}

      {!loading && eventos > 0 && rows.length === 0 ? (
        <p className="app-panel__muted">Este club todavía no tiene integrantes para comparar.</p>
      ) : null}

      {!loading && rows.length ? (
        <ol className="attendance-rank__list">
          {rows.map((row, index) => {
            const highlight = best.has(row.persona_id)
            return (
              <li
                key={row.persona_id}
                className={`attendance-rank__row${highlight ? ' is-best' : ''}`}
                style={{ animationDelay: `${Math.min(index, 14) * 40}ms` }}
              >
                <span className="attendance-rank__place">{index + 1}</span>
                <span className="attendance-mark__avatar" aria-hidden="true">
                  {memberInitials(row.full_name)}
                </span>
                <div className="attendance-rank__who">
                  <p>
                    {row.full_name}
                    {highlight ? <span className="attendance-rank__badge">Mejor asistencia</span> : null}
                  </p>
                  <small>
                    {row.presentes}/{row.eventos} eventos
                    {row.justificados ? ` · ${row.justificados} excusa${row.justificados === 1 ? '' : 's'}` : ''}
                  </small>
                  <span
                    className="attendance-rank__bar"
                    style={{ '--pct': `${row.porcentaje}%` } as CSSProperties}
                  >
                    <span />
                  </span>
                </div>
                <strong className="attendance-rank__pct">{row.porcentaje}%</strong>
              </li>
            )
          })}
        </ol>
      ) : null}
    </div>
  )
}
