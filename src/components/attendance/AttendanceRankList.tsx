import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
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
  const topPresentes = Math.max(0, ...rows.map((row) => row.presentes))
  if (topPresentes <= 0) return new Set()
  const tied = rows.filter((row) => row.presentes === topPresentes)
  const topPuntual = Math.max(0, ...tied.map((row) => row.puntuales ?? 0))
  return new Set(tied.filter((row) => (row.puntuales ?? 0) === topPuntual).map((row) => row.persona_id))
}

function reduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function AttendanceRankList({ ranking, loading = false }: AttendanceRankListProps) {
  const [query, setQuery] = useState('')
  const [moves, setMoves] = useState<Map<number, number>>(new Map())
  const listRef = useRef<HTMLOListElement>(null)
  const prevTops = useRef(new Map<number, number>())
  const prevPlaces = useRef(new Map<number, number>())
  const moveTimer = useRef<number>(0)
  const rows = ranking?.integrantes ?? []
  const best = bestIds(rows)
  const eventos = ranking?.eventos ?? 0
  const filtered = useMemo(() => {
    const source = ranking?.integrantes ?? []
    const needle = query.trim().toLowerCase()
    const ranked = source.map((row, index) => ({ row, place: index + 1 }))
    if (!needle) return ranked
    return ranked.filter(({ row }) => {
      const haystack = `${row.full_name} ${row.identificacion ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [query, ranking?.integrantes])

  useLayoutEffect(() => {
    const source = ranking?.integrantes ?? []
    const nextMoves = new Map<number, number>()
    source.forEach((row, index) => {
      const place = index + 1
      const previous = prevPlaces.current.get(row.persona_id)
      if (previous != null && previous !== place) {
        nextMoves.set(row.persona_id, previous - place)
      }
      prevPlaces.current.set(row.persona_id, place)
    })
    if (nextMoves.size > 0) {
      setMoves(nextMoves)
      window.clearTimeout(moveTimer.current)
      moveTimer.current = window.setTimeout(() => setMoves(new Map()), 1600)
    }

    const list = listRef.current
    if (!list || reduceMotion()) return

    const nodes = list.querySelectorAll<HTMLElement>('[data-persona-id]')
    nodes.forEach((el) => {
      const id = Number(el.dataset.personaId)
      const last = el.getBoundingClientRect().top
      const first = prevTops.current.get(id)
      if (first != null) {
        const delta = first - last
        if (Math.abs(delta) > 2) {
          el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], {
            duration: 680,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          })
        }
      }
      prevTops.current.set(id, last)
    })
  }, [ranking?.integrantes])

  useEffect(() => {
    return () => window.clearTimeout(moveTimer.current)
  }, [])

  return (
    <div className="attendance-rank">
      {!loading && rows.length ? (
        <label className="attendance-mark__search attendance-rank__search">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o documento"
          />
        </label>
      ) : null}

      {loading ? <p className="app-panel__muted">Cargando resumen…</p> : null}

      {!loading && eventos === 0 ? (
        <p className="app-panel__muted">
          Todavía no hay asistencia registrada. Cuando marques un evento, aquí verás el ranking.
        </p>
      ) : null}

      {!loading && eventos > 0 && rows.length === 0 ? (
        <p className="app-panel__muted">Este club todavía no tiene integrantes para comparar.</p>
      ) : null}

      {!loading && rows.length > 0 && filtered.length === 0 ? (
        <p className="app-panel__muted">Ningún integrante coincide con la búsqueda.</p>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <ol className="attendance-rank__list" ref={listRef} aria-live="polite">
          {filtered.map(({ row, place }, index) => {
            const highlight = best.has(row.persona_id)
            const puntuales = row.puntuales ?? 0
            const photo = resolveFileUrl(row.foto_url)
            const shift = moves.get(row.persona_id) ?? 0
            const motion = shift > 0 ? ' is-rise' : shift < 0 ? ' is-drop' : ''
            return (
              <li
                key={row.persona_id}
                data-persona-id={row.persona_id}
                className={`attendance-rank__row${highlight ? ' is-best' : ''}${motion}`}
                style={{ animationDelay: `${Math.min(index, 14) * 40}ms` }}
              >
                <span className={`attendance-rank__place${motion}`}>
                  {place}
                  {shift ? (
                    <em className="attendance-rank__delta">
                      {shift > 0 ? `▲${shift}` : `▼${Math.abs(shift)}`}
                    </em>
                  ) : null}
                </span>
                <span className="attendance-mark__avatar" aria-hidden="true">
                  {photo ? <img src={photo} alt="" /> : memberInitials(row.full_name)}
                </span>
                <div className="attendance-rank__who">
                  <p>
                    {row.full_name}
                    {highlight ? <span className="attendance-rank__badge">Mejor asistencia</span> : null}
                  </p>
                  <small>
                    {row.presentes}/{row.eventos} eventos
                    {` · ${puntuales} puntual${puntuales === 1 ? '' : 'es'}`}
                    {row.justificados ? ` · ${row.justificados} excusa${row.justificados === 1 ? '' : 's'}` : ''}
                  </small>
                  <span className="attendance-rank__bar" style={{ '--pct': `${row.porcentaje}%` } as CSSProperties}>
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
