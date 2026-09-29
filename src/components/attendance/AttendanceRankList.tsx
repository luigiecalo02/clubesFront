import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { attendanceApi } from '../../api/attendance'
import { resolveFileUrl } from '../../api/baseUrl'
import { getApiErrorMessage } from '../../api/client'
import type { CSSProperties } from 'react'
import type { AttendanceEstado, AttendanceMemberHistory, AttendanceRankRow, AttendanceRanking } from '../../api/types'
import { memberInitials } from './AttendanceMarkList'
import { DateInput } from '../../theme/DateInput'
import { CreateDrawer } from '../../theme/CreateDrawer'
import { boundsForMonth, formatDate, formatDateRange, monthKey } from '../../theme/dates'
import { useNotice } from '../../theme/NoticeProvider'
import '../../theme/attendance-mark.css'
import '../../theme/attendance-rank.css'

type AttendanceRankListProps = {
  ranking: AttendanceRanking | null
  loading?: boolean
  from: string
  to: string
  onRangeChange: (from: string, to: string) => void
}

type RangeMode = 'mes' | 'fechas'

const ESTADO_LABEL: Record<string, string> = {
  puntual: 'Puntual',
  presente: 'Asistió',
  justificado: 'Excusa',
  ausente: 'Ausente',
}

function bestIds(rows: AttendanceRankRow[]): Set<number> {
  const topPoints = Math.max(0, ...rows.map((row) => row.puntos ?? row.presentes))
  if (topPoints <= 0) return new Set()
  const tied = rows.filter((row) => (row.puntos ?? row.presentes) === topPoints)
  const topPuntual = Math.max(0, ...tied.map((row) => row.puntuales ?? 0))
  return new Set(tied.filter((row) => (row.puntuales ?? 0) === topPuntual).map((row) => row.persona_id))
}

function reduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function estadoLabel(estado?: AttendanceEstado | null): string {
  if (!estado) return 'Sin marcar'
  return ESTADO_LABEL[estado] ?? estado
}

export function AttendanceRankList({
  ranking,
  loading = false,
  from,
  to,
  onRangeChange,
}: AttendanceRankListProps) {
  const notices = useNotice()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<RangeMode>('mes')
  const [month, setMonth] = useState(() => monthKey())
  const [openId, setOpenId] = useState<number | null>(null)
  const [history, setHistory] = useState<AttendanceMemberHistory | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
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
  const openRow = rows.find((row) => row.persona_id === openId) ?? null

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

  useEffect(() => {
    if (!openId) {
      setHistory(null)
      return
    }
    let cancelled = false
    setLoadingHistory(true)
    attendanceApi
      .memberHistory(openId, { desde: from, hasta: to })
      .then((next) => {
        if (!cancelled) setHistory(next)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar el detalle de asistencia'))
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false)
      })
    return () => {
      cancelled = true
    }
  }, [from, notices, openId, to])

  function applyMonth(next: string) {
    setMonth(next)
    const bounds = boundsForMonth(next)
    onRangeChange(bounds.from, bounds.to)
  }

  function changeMode(next: RangeMode) {
    setMode(next)
    if (next === 'mes') applyMonth(month)
  }

  function changeFrom(value: string) {
    onRangeChange(value, value && to && value > to ? value : to)
  }

  function changeTo(value: string) {
    onRangeChange(from && value && value < from ? value : from, value)
  }

  return (
    <div className="attendance-rank">
      <div className="attendance-rank__filters">
        <label>
          Periodo
          <select
            value={mode}
            aria-label="Periodo del ranking"
            onChange={(event) => changeMode(event.target.value as RangeMode)}
          >
            <option value="mes">Por mes</option>
            <option value="fechas">Por fechas</option>
          </select>
        </label>
        {mode === 'mes' ? (
          <label>
            Mes
            <input type="month" value={month} onChange={(event) => applyMonth(event.target.value)} />
          </label>
        ) : (
          <>
            <label>
              Desde
              <DateInput value={from} max={to || undefined} onChange={changeFrom} />
            </label>
            <label>
              Hasta
              <DateInput value={to} min={from || undefined} onChange={changeTo} />
            </label>
          </>
        )}
        {!loading && rows.length ? (
          <label className="attendance-rank__search">
            Buscar
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre o documento"
            />
          </label>
        ) : null}
      </div>

      {loading ? <p className="app-panel__muted">Cargando resumen…</p> : null}

      {!loading && eventos === 0 ? (
        <p className="app-panel__muted">
          No hay asistencia registrada en {formatDateRange(from, to)}. Cambia el periodo o marca un
          evento.
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
            const puntos = row.puntos ?? row.presentes
            const photo = resolveFileUrl(row.foto_url)
            const shift = moves.get(row.persona_id) ?? 0
            const motion = shift > 0 ? ' is-rise' : shift < 0 ? ' is-drop' : ''
            return (
              <li key={row.persona_id}>
                <button
                  type="button"
                  data-persona-id={row.persona_id}
                  className={`attendance-rank__row${highlight ? ' is-best' : ''}${motion}`}
                  style={{ animationDelay: `${Math.min(index, 14) * 40}ms` }}
                  onClick={() => setOpenId(row.persona_id)}
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
                      {puntos} pt{puntos === 1 ? '' : 's'} · {row.presentes}/{row.eventos} eventos
                      {` · ${puntuales} puntual${puntuales === 1 ? '' : 'es'}`}
                      {row.justificados ? ` · ${row.justificados} excusa${row.justificados === 1 ? '' : 's'}` : ''}
                    </small>
                    <span className="attendance-rank__bar" style={{ '--pct': `${row.porcentaje}%` } as CSSProperties}>
                      <span />
                    </span>
                  </div>
                  <strong className="attendance-rank__pct">{puntos}</strong>
                </button>
              </li>
            )
          })}
        </ol>
      ) : null}

      <CreateDrawer
        open={Boolean(openRow)}
        size="half"
        title={history?.full_name || openRow?.full_name || 'Asistencias'}
        subtitle={formatDateRange(from, to)}
        avatar={resolveFileUrl(history?.foto_url || openRow?.foto_url)}
        avatarFallback={memberInitials(history?.full_name || openRow?.full_name || 'AB')}
        onClose={() => setOpenId(null)}
      >
        {openRow ? (
          <div className="attendance-history">
            <div className="attendance-history__stats">
              <p className="event-countdown__cell">
                <strong>{history?.puntos ?? openRow.puntos ?? openRow.presentes}</strong>
                <span>Puntos</span>
              </p>
              <p className="event-countdown__cell">
                <strong>
                  {history?.presentes ?? openRow.presentes}/{history?.eventos ?? openRow.eventos}
                </strong>
                <span>Asistencias</span>
              </p>
              <p className="event-countdown__cell">
                <strong>{history?.porcentaje ?? openRow.porcentaje}%</strong>
                <span>Cumplimiento</span>
              </p>
            </div>

            {loadingHistory ? <p className="app-panel__muted">Cargando eventos…</p> : null}

            {!loadingHistory && history && history.registros.length === 0 ? (
              <p className="app-panel__muted">No hay eventos con asistencia en este periodo.</p>
            ) : null}

            {!loadingHistory && history?.registros.length ? (
              <ul className="attendance-history__list">
                {history.registros.map((item) => {
                  const photo = resolveFileUrl(item.image_url)
                  return (
                    <li key={item.id} className={item.puntos > 0 ? 'is-ok' : ''}>
                      <span className="attendance-mark__avatar is-square" aria-hidden="true">
                        {photo ? <img src={photo} alt="" /> : memberInitials(item.name)}
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>
                          {formatDate(item.starts_at) || 'Sin fecha'} · {estadoLabel(item.estado)}
                        </small>
                      </span>
                      <em>{item.puntos} pt</em>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CreateDrawer>
    </div>
  )
}
