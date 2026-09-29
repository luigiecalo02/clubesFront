import { useEffect, useState } from 'react'
import { abonosApi } from '../../api/abonos'
import { attendanceApi } from '../../api/attendance'
import { resolveFileUrl } from '../../api/baseUrl'
import { getApiErrorMessage } from '../../api/client'
import type { AbonoFila, AbonosBoard, AttendanceEstado, AttendanceMemberHistory, ClubPerson } from '../../api/types'
import { CreateDrawer } from '../../theme/CreateDrawer'
import { formatDate, formatDateRange } from '../../theme/dates'
import { useNotice } from '../../theme/NoticeProvider'
import { memberInitials } from '../attendance/AttendanceMarkList'
import '../../theme/abonos.css'
import '../../theme/attendance-mark.css'
import '../../theme/attendance-rank.css'

export type MemberInsightKind = 'saldos' | 'asistencias'

type MemberInsightDrawerProps = {
  persona: ClubPerson | null
  kind: MemberInsightKind | null
  onClose: () => void
}

const ESTADO_LABEL: Record<string, string> = {
  puntual: 'Puntual',
  presente: 'Asistió',
  justificado: 'Excusa',
  ausente: 'Ausente',
}

const MOBILE_DRAWER = '(max-width: 900px)'

function formatPrice(value: number | string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function emptyBoard(): AbonosBoard {
  return {
    modo: 'integrante',
    resumen: { comprometido: 0, abonado: 0, pendiente: 0 },
    opciones_integrantes: [],
    opciones_actividades: [],
    filas: [],
  }
}

function estadoLabel(estado?: AttendanceEstado | null): string {
  if (!estado) return 'Sin marcar'
  return ESTADO_LABEL[estado] ?? estado
}

function filaKey(row: AbonoFila, index: number): string {
  return `${row.evento_id ?? 'e'}-${index}`
}

export function MemberInsightDrawer({ persona, kind, onClose }: MemberInsightDrawerProps) {
  const notices = useNotice()
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_DRAWER).matches : false,
  )
  const [loading, setLoading] = useState(false)
  const [board, setBoard] = useState<AbonosBoard>(emptyBoard)
  const [history, setHistory] = useState<AttendanceMemberHistory | null>(null)
  const open = Boolean(persona && kind)
  const photo = resolveFileUrl(persona?.foto_url || history?.foto_url)
  const initials = memberInitials(persona?.full_name || history?.full_name || 'AB')
  const title = persona?.full_name || 'Integrante'
  const subtitle = kind === 'saldos' ? 'Saldos' : kind === 'asistencias' ? 'Asistencias' : null

  useEffect(() => {
    const media = window.matchMedia(MOBILE_DRAWER)
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!persona || !kind) {
      setBoard(emptyBoard())
      setHistory(null)
      return
    }

    let cancelled = false
    setLoading(true)
    const request =
      kind === 'saldos'
        ? abonosApi.board({ modo: 'integrante', personaId: persona.id }).then((next) => {
            if (!cancelled) setBoard(next)
          })
        : attendanceApi.memberHistory(persona.id).then((next) => {
            if (!cancelled) setHistory(next)
          })

    request
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar el detalle'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [kind, notices, persona])

  return (
    <CreateDrawer
      open={open}
      size="half"
      placement={isMobile ? 'bottom' : 'end'}
      title={title}
      subtitle={subtitle}
      avatar={photo}
      avatarFallback={initials}
      onClose={onClose}
    >
      {kind === 'saldos' ? (
        <div className="abonos-detail">
          <div className="abonos-deal__money">
            <p className="event-countdown__cell">
              <strong>{formatPrice(board.resumen.comprometido)}</strong>
              <span>Comprometido</span>
            </p>
            <p className="event-countdown__cell">
              <strong>{formatPrice(board.resumen.abonado)}</strong>
              <span>Abonado</span>
            </p>
            <p className="event-countdown__cell">
              <strong>{formatPrice(board.resumen.pendiente)}</strong>
              <span>Pendiente</span>
            </p>
          </div>

          {loading ? <p className="app-panel__muted">Cargando saldos…</p> : null}

          {!loading && board.filas.length === 0 ? (
            <p className="app-panel__muted">Esta persona no tiene compromisos registrados.</p>
          ) : null}

          {!loading && board.filas.length ? (
            <section className="abonos-deals">
              <h3>Actividades</h3>
              {board.filas.map((row, index) => {
                const paid = row.pendiente <= 0
                const eventPhoto = resolveFileUrl(row.image_url)
                return (
                  <article key={filaKey(row, index)} className="abonos-deal">
                    <div className="abonos-deal__toggle">
                      <span className="abonos-avatar is-square" aria-hidden="true">
                        {eventPhoto ? <img src={eventPhoto} alt="" /> : memberInitials(row.evento_name || '?')}
                      </span>
                      <span className="abonos-deal__who">
                        <strong>{row.evento_name || 'Actividad'}</strong>
                        <small>{row.starts_at ? formatDate(row.starts_at) : 'Sin fecha'}</small>
                      </span>
                      <span className={`abonos-deal__badge${paid ? ' is-ok' : ''}`}>
                        {paid ? 'Pagado' : formatPrice(row.pendiente)}
                      </span>
                    </div>
                  </article>
                )
              })}
            </section>
          ) : null}
        </div>
      ) : null}

      {kind === 'asistencias' ? (
        <div className="attendance-history">
          <div className="attendance-history__stats">
            <p className="event-countdown__cell">
              <strong>{history?.puntos ?? 0}</strong>
              <span>Puntos</span>
            </p>
            <p className="event-countdown__cell">
              <strong>
                {history?.presentes ?? 0}/{history?.eventos ?? 0}
              </strong>
              <span>Asistencias</span>
            </p>
            <p className="event-countdown__cell">
              <strong>{history?.porcentaje ?? 0}%</strong>
              <span>Cumplimiento</span>
            </p>
          </div>

          {history?.desde || history?.hasta ? (
            <p className="app-panel__muted">{formatDateRange(history.desde, history.hasta)}</p>
          ) : null}

          {loading ? <p className="app-panel__muted">Cargando asistencias…</p> : null}

          {!loading && history && history.registros.length === 0 ? (
            <p className="app-panel__muted">No hay eventos con asistencia registrados.</p>
          ) : null}

          {!loading && history?.registros.length ? (
            <ul className="attendance-history__list">
              {history.registros.map((item) => {
                const eventPhoto = resolveFileUrl(item.image_url)
                return (
                  <li key={item.id} className={item.puntos > 0 ? 'is-ok' : ''}>
                    <span className="attendance-mark__avatar is-square" aria-hidden="true">
                      {eventPhoto ? <img src={eventPhoto} alt="" /> : memberInitials(item.name)}
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
  )
}
