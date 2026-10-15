import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { abonosApi } from '../../api/abonos'
import { attendanceApi } from '../../api/attendance'
import { resolveFileUrl } from '../../api/baseUrl'
import { eventsApi } from '../../api/events'
import type { AbonosBoard, AttendanceEstado, AttendanceMemberHistory, EventSummary } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import { MY_ABONOS, MY_ABONOS_REGISTER_PERMISSION, type AdminIconName } from '../../admin/menu'
import { useAuth } from '../../auth/AuthProvider'
import { memberInitials } from '../attendance/AttendanceMarkList'
import { formatMoney } from '../presupuesto/presupuestoView'
import { AppPanel } from '../../theme/AppPanel'
import { AppTabs } from '../../theme/AppTabs'
import { formatDate } from '../../theme/dates'
import '../../theme/home-start.css'

type ActivityTab = 'recientes' | 'proximas' | 'realizadas'
type ActivityBadge = 'proxima' | 'asistio' | 'puntual' | 'ausente' | 'excusa' | 'sin_marcar'

type HomeActivity = {
  id: string
  name: string
  startsAt?: string | null
  place?: string | null
  image?: string | null
  badge: ActivityBadge
}

const TABS: { id: ActivityTab; label: string; icon: AdminIconName }[] = [
  { id: 'recientes', label: 'Recientes', icon: 'hourglass' },
  { id: 'proximas', label: 'Próximas', icon: 'calendar' },
  { id: 'realizadas', label: 'Realizadas', icon: 'check' },
]

const BADGE_LABEL: Record<ActivityBadge, string> = {
  proxima: 'Próxima',
  asistio: 'Asistió',
  puntual: 'Puntual',
  ausente: 'No asistió',
  excusa: 'Excusa',
  sin_marcar: 'Sin marcar',
}

const DONE_BADGES: ActivityBadge[] = ['asistio', 'puntual', 'ausente', 'excusa']

function attendancePercent(history: AttendanceMemberHistory | null): number {
  if (!history || history.eventos <= 0) return 0
  if (history.porcentaje > 0) return Math.round(history.porcentaje)
  return Math.round((history.presentes / history.eventos) * 100)
}

function lateCount(history: AttendanceMemberHistory | null): number {
  if (!history) return 0
  return Math.max(0, history.presentes - history.puntuales)
}

function badgeFor(
  estado?: AttendanceEstado | null,
  inscrito?: boolean,
): ActivityBadge {
  if (estado === 'puntual') return 'puntual'
  if (estado === 'presente') return 'asistio'
  if (estado === 'justificado') return 'excusa'
  if (estado === 'ausente' && inscrito !== false) return 'ausente'
  if (inscrito === false) return 'sin_marcar'
  if (!estado) return 'sin_marcar'
  return 'proxima'
}

function fromHistory(history: AttendanceMemberHistory | null): HomeActivity[] {
  return (history?.registros ?? [])
    .filter((item) => item.inscrito !== false || Boolean(item.estado && item.estado !== 'ausente'))
    .map((item) => ({
      id: `h-${item.id}`,
      name: item.name,
      startsAt: item.starts_at,
      image: item.image_url,
      badge: badgeFor(item.estado, item.inscrito),
    }))
    .sort((a, b) => (b.startsAt ?? '').localeCompare(a.startsAt ?? ''))
}

function fromEvents(events: EventSummary[]): HomeActivity[] {
  return [...events]
    .sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? ''))
    .map((item) => ({
      id: `e-${item.id}`,
      name: item.name,
      startsAt: item.starts_at,
      place: item.lugar,
      image: item.image_url,
      badge: 'proxima' as const,
    }))
}

function AttendanceRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  const radius = 28
  const length = 2 * Math.PI * radius
  const filled = (pct / 100) * length

  return (
    <div className="home-start__ring" aria-label={`${pct}% de asistencias`}>
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle className="home-start__ring-track" cx="36" cy="36" r={radius} />
        <circle
          className="home-start__ring-value"
          cx="36"
          cy="36"
          r={radius}
          strokeDasharray={`${filled} ${length - filled}`}
        />
      </svg>
      <span>
        <AdminIcon name="star" />
        <strong>{pct}%</strong>
        <small>Asistencias</small>
      </span>
    </div>
  )
}

export function HomeStartCard() {
  const auth = useAuth()
  const user = auth.user
  const ctx = user?.contexto
  const personaId = user?.persona_id ?? null
  const canOpenMyAbonos = auth.can('mis_abonos.view') && auth.can(MY_ABONOS_REGISTER_PERMISSION)
  const canOpenEvents = auth.can('events.view')
  const [tab, setTab] = useState<ActivityTab>('recientes')
  const [hideSaldo, setHideSaldo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<AttendanceMemberHistory | null>(null)
  const [board, setBoard] = useState<AbonosBoard | null>(null)
  const [upcoming, setUpcoming] = useState<EventSummary[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const jobs: Promise<void>[] = [
      eventsApi
        .upcoming()
        .then((rows) => {
          if (!cancelled) setUpcoming(rows)
        })
        .catch(() => undefined),
    ]
    if (personaId) {
      jobs.push(
        attendanceApi
          .memberHistory(personaId)
          .then((row) => {
            if (!cancelled) setHistory(row)
          })
          .catch(() => undefined),
        abonosApi
          .board({ modo: 'integrante', personaId })
          .then((row) => {
            if (!cancelled) setBoard(row)
          })
          .catch(() => undefined),
      )
    }
    void Promise.all(jobs).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [personaId])

  const recent = useMemo(() => fromHistory(history), [history])
  const nextEvents = useMemo(() => fromEvents(upcoming), [upcoming])
  const done = useMemo(
    () => recent.filter((item) => DONE_BADGES.includes(item.badge)),
    [recent],
  )
  const visible = tab === 'proximas' ? nextEvents : tab === 'realizadas' ? done : recent
  const nextActivity = nextEvents[0] ?? null
  const photo = resolveFileUrl(user?.avatar_url || history?.foto_url)
  const name = history?.full_name || user?.name || 'Integrante'
  const role = ctx?.rol_display_name || user?.roles[0] || 'Integrante'
  const club = ctx?.organizacion_nombre || 'Tu club'
  const percent = attendancePercent(history)
  const saldo = board?.resumen.pendiente ?? 0

  if (!user) return null

  const saldoCard = (
    <AppPanel shine={false} className="home-start__action">
      <span className="home-start__action-icon" data-tone="gold">
        <AdminIcon name="wallet" />
      </span>
      <span>
        <small>Mi saldo</small>
        {saldo <= 0 ? (
          <strong className="home-start__paid">
            <AdminIcon name="check" />
            Al día
          </strong>
        ) : (
          <strong>{hideSaldo ? '***' : formatMoney(saldo)}</strong>
        )}
      </span>
      <span className="home-start__action-tools">
        {saldo > 0 ? (
          <button
            type="button"
            className="home-start__eye"
            aria-pressed={hideSaldo}
            aria-label={hideSaldo ? 'Mostrar saldo' : 'Ocultar saldo'}
            onClick={() => setHideSaldo((current) => !current)}
          >
            <AdminIcon name={hideSaldo ? 'eyeOff' : 'eye'} />
          </button>
        ) : null}
        {saldo > 0 && canOpenMyAbonos ? (
          <Link className="app-panel__btn--primary home-start__pay" to={MY_ABONOS}>
            <AdminIcon name="wallet" />
            Abonar
          </Link>
        ) : null}
      </span>
    </AppPanel>
  )

  const nextCard = (
    <AppPanel shine={false} className="home-start__action">
      <span className="home-start__action-icon" data-tone="hint">
        <AdminIcon name="calendar" />
      </span>
      <span>
        <small>Próxima actividad</small>
        <strong>{nextActivity?.name || 'Sin actividad próxima'}</strong>
        <em>{nextActivity ? formatDate(nextActivity.startsAt) || 'Sin fecha' : 'Cuando haya un evento, aparecerá aquí'}</em>
      </span>
      {canOpenEvents && nextActivity ? <AdminIcon name="chevronRight" /> : null}
    </AppPanel>
  )

  return (
    <section className="home-start" aria-label="Inicio">
      <AppPanel shine={false} className="home-start__profile">
        <Link className="home-start__photo" to="/perfil" aria-label="Ver perfil">
          {photo ? <img src={photo} alt="" /> : memberInitials(name)}
        </Link>
        <div className="home-start__identity">
          <h2>{name}</h2>
          <span className="home-start__role">
            <AdminIcon name="user" />
            {role}
          </span>
          <p>{club}</p>
          <Link className="home-start__profile-link" to="/perfil">
            Ver perfil
          </Link>
        </div>
        <AttendanceRing value={percent} />
      </AppPanel>

      <AppPanel shine={false} className="home-start__stats">
        <p>
          <span data-tone="hint"><AdminIcon name="users" /></span>
          <strong>{history?.eventos ?? 0}</strong>
          <small>Actividades totales</small>
        </p>
        <p>
          <span data-tone="ok"><AdminIcon name="check" /></span>
          <strong>{history?.presentes ?? 0}</strong>
          <small>Asistidas</small>
        </p>
        <p>
          <span data-tone="gold"><AdminIcon name="hourglass" /></span>
          <strong>{lateCount(history)}</strong>
          <small>Llegadas tarde</small>
        </p>
        <p>
          <span data-tone="alert"><AdminIcon name="x" /></span>
          <strong>{history?.ausentes ?? 0}</strong>
          <small>Inasistencias</small>
        </p>
      </AppPanel>

      <div className="home-start__actions">
        {saldoCard}
        {canOpenEvents && nextActivity ? <Link to="/eventos">{nextCard}</Link> : nextCard}
      </div>

      <AppPanel shine={false} className="home-start__activities">
        <header>
          <h3>
            <AdminIcon name="pulse" />
            Mis actividades
          </h3>
          {canOpenEvents ? (
            <Link className="app-panel__link app-panel__link--accent" to="/eventos">
              Ver todas
              <AdminIcon name="chevronRight" />
            </Link>
          ) : null}
        </header>

        <AppTabs
          label="Actividades"
          value={tab}
          onChange={setTab}
          tabs={TABS.map((item) => ({
            id: item.id,
            label: <><AdminIcon name={item.icon} /> {item.label}</>,
          }))}
        >
        {loading ? <p className="app-panel__muted">Cargando tu resumen…</p> : null}

        {!loading && visible.length === 0 ? (
          <p className="app-panel__hint">No hay actividades para mostrar en esta lista.</p>
        ) : null}

        {!loading && visible.length > 0 ? (
          <ul>
            {visible.slice(0, 6).map((item) => {
              const image = resolveFileUrl(item.image)
              const body = (
                <>
                  <span className="home-start__thumb" aria-hidden="true">
                    {image ? <img src={image} alt="" /> : memberInitials(item.name)}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      <AdminIcon name="calendar" />
                      {formatDate(item.startsAt) || 'Sin fecha'}
                      {item.place ? (
                        <>
                          <AdminIcon name="map" />
                          {item.place}
                        </>
                      ) : null}
                    </small>
                  </span>
                  <em data-badge={item.badge}>
                    {item.badge === 'puntual' ? <AdminIcon name="star" /> : null}
                    {BADGE_LABEL[item.badge]}
                  </em>
                  <AdminIcon name="chevronRight" />
                </>
              )
              return (
                <li key={item.id}>
                  {canOpenEvents ? <Link to="/eventos">{body}</Link> : <div>{body}</div>}
                </li>
              )
            })}
          </ul>
        ) : null}
        </AppTabs>
      </AppPanel>
    </section>
  )
}
