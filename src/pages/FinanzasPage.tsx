import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { resolveFileUrl } from '../api/baseUrl'
import { getApiErrorMessage } from '../api/client'
import { finanzasApi } from '../api/finanzas'
import { isSameResumen, subscribeFinanzasChanged } from '../api/finanzasLive'
import type {
  FinanzasActividad,
  FinanzasCuenta,
  FinanzasMovimiento,
  FinanzasParte,
  FinanzasResumen,
} from '../api/types'
import { canAccessClubFinanzas, clubAccessFromUser, isSuperAdminUser, type AdminIconName } from '../admin/menu'
import { SummaryIcon, type SummaryTone } from '../components/events/SummaryCards'
import { useAuth } from '../auth/AuthProvider'
import { AppPanel } from '../theme/AppPanel'
import { AppTabs } from '../theme/AppTabs'
import { CreateDrawer } from '../theme/CreateDrawer'
import { NumberPadInput } from '../theme/NumberPad'
import { formatDate } from '../theme/dates'
import { useNotice } from '../theme/NoticeProvider'
import { reduceMotion, useTweenNumber } from '../theme/useTweenNumber'
import '../theme/finanzas.css'

type TabId = 'resumen' | 'actividades' | 'movimientos'

function formatMoney(value: number): string {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const DESTINOS = [
  { key: 'participantes', label: 'Participantes (ganancia)' },
  { key: 'diezmo', label: 'Diezmos' },
  { key: 'ofrenda', label: 'Ofrendas' },
  { key: 'club', label: 'Club (ganancia)' },
  { key: 'extras', label: 'Otros' },
  { key: 'capital', label: 'Capital / costos' },
] as const

const ACTIVIDAD_PARTES = [
  { key: 'capital', label: 'Capital', tone: 'muted' },
  { key: 'diezmo', label: 'Diezmo', tone: 'gold' },
  { key: 'ofrenda', label: 'Ofrenda', tone: 'danger' },
  { key: 'participantes', label: 'Participantes', tone: 'ok' },
  { key: 'club', label: 'Club', tone: 'club' },
  { key: 'extras', label: 'Otros', tone: 'extras' },
] as const

type DestinoKey = (typeof DESTINOS)[number]['key']
type EgresoConceptoKey = 'capital' | 'diezmo' | 'ofrenda'

type MovimientoTipo = 'ingreso' | 'egreso' | 'transferencia'

type MovimientoFormState = {
  cuenta_bancaria_id: string
  cuenta_destino_id: string
  tipo: MovimientoTipo
  monto: string
  concepto: string
  evento_id: string
  destino: '' | DestinoKey
  persona_id: string
}

function moneyDigits(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  return String(Math.round(value))
}

type ConceptoMontos = {
  proyectado: number
  recogido: number
  disponible: number
}

function remainingOf(
  actividad: FinanzasResumen['actividades'][number] | undefined,
  key: EgresoConceptoKey,
  recogido: number,
): number {
  if (!actividad) return recogido
  const value = Number(actividad[key])
  return Number.isFinite(value) ? value : recogido
}

function amountsForEvent(
  eventoId: string,
  eventos: FinanzasResumen['eventos'],
  actividades: FinanzasResumen['actividades'],
): Record<EgresoConceptoKey, ConceptoMontos> {
  const evento = eventos.find((item) => String(item.id) === eventoId)
  const actividad = actividades.find((item) => String(item.id) === eventoId)
  const capitalRecogido = Number(evento?.capital_recogido) || 0
  const diezmoRecogido = Number(evento?.diezmo_recogido) || 0
  const ofrendaRecogido = Number(evento?.ofrenda_recogido) || 0
  return {
    capital: {
      proyectado: Number(evento?.capital) || 0,
      recogido: capitalRecogido,
      disponible: remainingOf(actividad, 'capital', capitalRecogido),
    },
    diezmo: {
      proyectado: Number(evento?.diezmo) || 0,
      recogido: diezmoRecogido,
      disponible: remainingOf(actividad, 'diezmo', diezmoRecogido),
    },
    ofrenda: {
      proyectado: Number(evento?.ofrenda) || 0,
      recogido: ofrendaRecogido,
      disponible: remainingOf(actividad, 'ofrenda', ofrendaRecogido),
    },
  }
}

function montoConcepto(montos: ConceptoMontos): number {
  if (montos.disponible > 0) return montos.disponible
  if (montos.recogido > 0) return 0
  return montos.proyectado
}

function conceptoOptionLabel(label: string, montos: ConceptoMontos): string {
  return `${label} · proyectado ${formatMoney(montos.proyectado)} · disponible ${formatMoney(montos.disponible)}`
}

function cuentaOpcionLabel(cuenta: FinanzasResumen['cuentas_bancarias'][number]): string {
  return `${cuenta.nombre} · ${formatMoney(Number(cuenta.saldo) || 0)}`
}

function transferenciaConcepto(
  cuentas: FinanzasResumen['cuentas_bancarias'],
  origenId: string,
  destinoId: string,
): string {
  const origen = cuentas.find((cuenta) => String(cuenta.id) === origenId)
  const destino = cuentas.find((cuenta) => String(cuenta.id) === destinoId)
  if (!origen || !destino) return 'Transferencia entre cuentas'
  return `Transferencia · ${origen.nombre} → ${destino.nombre}`
}

function destinoLabel(clave: '' | DestinoKey): string {
  return DESTINOS.find((item) => item.key === clave)?.label ?? ''
}

function personaNombre(
  eventos: FinanzasResumen['eventos'],
  eventoId: string,
  personaId: string,
): string {
  const evento = eventos.find((item) => String(item.id) === eventoId)
  return evento?.participantes?.find((item) => String(item.id) === personaId)?.nombre ?? ''
}

function applyDestino(
  form: MovimientoFormState,
  destino: '' | DestinoKey,
  eventos: FinanzasResumen['eventos'],
  actividades: FinanzasResumen['actividades'],
  personaId = form.persona_id,
): MovimientoFormState {
  const next: MovimientoFormState = {
    ...form,
    destino,
    persona_id: destino === 'participantes' ? personaId : '',
  }
  if (!destino) {
    return next
  }
  const evento = eventos.find((item) => String(item.id) === next.evento_id)
  const persona = personaNombre(eventos, next.evento_id, next.persona_id)
  const verb = next.tipo === 'egreso' ? 'Egreso' : 'Ingreso'
  const partes = [verb, destinoLabel(destino), evento?.nombre, persona].filter(Boolean)
  next.concepto = partes.join(' · ')
  if (
    next.tipo === 'egreso' &&
    next.evento_id &&
    (destino === 'capital' || destino === 'diezmo' || destino === 'ofrenda')
  ) {
    const monto = montoConcepto(amountsForEvent(next.evento_id, eventos, actividades)[destino])
    next.monto = moneyDigits(monto) || next.monto
  }
  return next
}

function yearBounds(date = new Date()) {
  const y = date.getFullYear()
  return {
    desde: `${y}-01-01`,
    hasta: `${y}-12-31`,
  }
}

function toneColor(tone: string): string {
  if (tone === 'ok') return 'var(--panel-ok-text)'
  if (tone === 'gold') return 'var(--panel-gold)'
  if (tone === 'danger') return 'var(--panel-danger)'
  if (tone === 'info' || tone === 'club') return 'var(--panel-info)'
  if (tone === 'extras') return 'color-mix(in srgb, var(--panel-gold) 45%, var(--panel-icon))'
  return 'color-mix(in srgb, var(--panel-muted) 55%, var(--panel-input-border))'
}

function donutStyle(parts: FinanzasParte[]): string {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.amount), 0)
  if (total <= 0) return 'conic-gradient(var(--panel-input-border) 0 100%)'
  let cursor = 0
  const stops = parts
    .filter((part) => part.amount > 0)
    .map((part) => {
      const start = cursor
      cursor += (part.amount / total) * 100
      return `${toneColor(part.tone)} ${start}% ${cursor}%`
    })
  return `conic-gradient(${stops.join(', ')})`
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)}%`
}

function partsSignature(parts: FinanzasParte[]): string {
  return parts.map((part) => `${part.key}:${part.amount}`).join('|')
}

function partAmount(parts: FinanzasParte[], key: string): number {
  return Number(parts.find((part) => part.key === key)?.amount) || 0
}

function useTweenParts(parts: FinanzasParte[]): FinanzasParte[] {
  const [shown, setShown] = useState(parts)
  const shownRef = useRef(parts)
  const partsRef = useRef(parts)
  partsRef.current = parts
  const signature = partsSignature(parts)

  useEffect(() => {
    const nextParts = partsRef.current
    if (reduceMotion() || partsSignature(shownRef.current) === signature) {
      shownRef.current = nextParts
      setShown(nextParts)
      return undefined
    }
    const fromMap = new Map(shownRef.current.map((part) => [part.key, part.amount]))
    const start = performance.now()
    const duration = 560
    let raf = 0
    const ease = (progress: number) => 1 - (1 - progress) ** 3
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = ease(progress)
      const next = nextParts.map((part) => {
        const from = fromMap.get(part.key) ?? 0
        return { ...part, amount: from + (part.amount - from) * eased }
      })
      const total = next.reduce((sum, part) => sum + Math.max(0, part.amount), 0)
      const withPct = next.map((part) => ({
        ...part,
        percent: total > 0 ? (Math.max(0, part.amount) / total) * 100 : 0,
      }))
      shownRef.current = withPct
      setShown(withPct)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [signature])

  return shown
}

function useFlash(watch: string | number): boolean {
  const [flash, setFlash] = useState(false)
  const prev = useRef(watch)
  const ready = useRef(false)
  useEffect(() => {
    if (!ready.current) {
      ready.current = true
      prev.current = watch
      return undefined
    }
    if (prev.current === watch) return undefined
    prev.current = watch
    if (reduceMotion()) return undefined
    setFlash(true)
    const timer = window.setTimeout(() => setFlash(false), 720)
    return () => window.clearTimeout(timer)
  }, [watch])
  return flash
}

function AnimatedMoney({ value }: { value: number }) {
  return <>{formatMoney(useTweenNumber(value))}</>
}

function emptyResumen(desde: string, hasta: string): FinanzasResumen {
  return {
    desde,
    hasta,
    kpis: { ingresos: 0, gastos: 0, disponible: 0, por_distribuir: 0, actividades: 0, conceptos_gasto: 0 },
    distribucion: [],
    serie_mensual: [],
    cuentas: [],
    movimientos: [],
    actividades: [],
    eventos: [],
    cuentas_bancarias: [],
  }
}

export function FinanzasPage() {
  const auth = useAuth()
  const notices = useNotice()
  const access = clubAccessFromUser(auth.user, auth.can)
  const canView =
    canAccessClubFinanzas(access) || auth.can('finanzas.view') || auth.can('abonos.view')
  const canUpdate = canAccessClubFinanzas(access) || auth.can('finanzas.update')
  const canDeleteMovimiento = isSuperAdminUser(auth.user)

  const bounds = useMemo(() => yearBounds(), [])
  const [desde, setDesde] = useState(bounds.desde)
  const [hasta, setHasta] = useState(bounds.hasta)
  const [tab, setTab] = useState<TabId>('resumen')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<FinanzasResumen>(() => emptyResumen(bounds.desde, bounds.hasta))
  const [saving, setSaving] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [form, setForm] = useState<MovimientoFormState>({
    cuenta_bancaria_id: '',
    cuenta_destino_id: '',
    tipo: 'egreso',
    monto: '',
    concepto: '',
    evento_id: '',
    destino: '',
    persona_id: '',
  })
  const [freshMoves, setFreshMoves] = useState<Set<number>>(new Set())
  const seenMoves = useRef<Set<number> | null>(null)
  const rangeRef = useRef({ desde, hasta })
  const noticesRef = useRef(notices)
  rangeRef.current = { desde, hasta }
  noticesRef.current = notices
  const shownParts = useTweenParts(data.distribucion)
  const donutFlash = useFlash(partsSignature(data.distribucion))

  useEffect(() => {
    if (!canView) return undefined
    let cancelled = false
    let debounce = 0
    let inflight = false
    let queued = false

    async function pull(showLoading: boolean) {
      if (cancelled) return
      if (inflight) {
        queued = true
        return
      }
      inflight = true
      if (showLoading) setLoading(true)
      try {
        const next = await finanzasApi.resumen(rangeRef.current)
        if (!cancelled) {
          setData((current) => (isSameResumen(current, next) ? current : next))
        }
      } catch (err) {
        if (!cancelled && showLoading) {
          noticesRef.current.error(getApiErrorMessage(err, 'No se pudo cargar finanzas'))
        }
      } finally {
        inflight = false
        if (showLoading && !cancelled) setLoading(false)
        if (queued && !cancelled) {
          queued = false
          void pull(false)
        }
      }
    }

    void pull(true)

    function refresh() {
      if (document.hidden) return
      window.clearTimeout(debounce)
      debounce = window.setTimeout(() => void pull(false), 280)
    }

    const unsubscribe = subscribeFinanzasChanged(refresh)
    document.addEventListener('visibilitychange', refresh)
    const poll = window.setInterval(refresh, 6000)

    return () => {
      cancelled = true
      unsubscribe()
      window.clearTimeout(debounce)
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [canView, desde, hasta])

  useEffect(() => {
    const ids = data.movimientos.map((mov) => mov.id)
    if (!seenMoves.current) {
      seenMoves.current = new Set(ids)
      return undefined
    }
    const fresh = new Set(ids.filter((id) => !seenMoves.current?.has(id)))
    seenMoves.current = new Set(ids)
    if (!fresh.size) return undefined
    setFreshMoves(fresh)
    const timer = window.setTimeout(() => setFreshMoves(new Set()), 900)
    return () => window.clearTimeout(timer)
  }, [data.movimientos])

  useEffect(() => {
    const cuentas = data.cuentas_bancarias ?? []
    setForm((current) => {
      if (current.cuenta_bancaria_id) {
        const stillValid = cuentas.some((cuenta) => String(cuenta.id) === current.cuenta_bancaria_id)
        return stillValid ? current : { ...current, cuenta_bancaria_id: '' }
      }
      if (cuentas.length === 1) {
        return { ...current, cuenta_bancaria_id: String(cuentas[0].id) }
      }
      return current
    })
  }, [data.cuentas_bancarias, form.cuenta_bancaria_id])

  async function onDeleteMovimiento(mov: FinanzasMovimiento) {
    if (!canDeleteMovimiento || deletingId) return
    if (!window.confirm(`¿Eliminar el movimiento “${mov.concepto}”? Esta acción no se puede deshacer.`)) return
    setDeletingId(mov.id)
    try {
      await finanzasApi.deleteMovimiento(mov.id)
      notices.success('Movimiento eliminado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo eliminar el movimiento'))
    } finally {
      setDeletingId(null)
    }
  }

  async function onSubmitMovimiento(event: FormEvent) {
    event.preventDefault()
    if (!canUpdate || saving) return
    const monto = Number(form.monto)
    const isTransfer = form.tipo === 'transferencia'
    if (!form.cuenta_bancaria_id || !form.concepto.trim() || !Number.isFinite(monto) || monto <= 0) {
      notices.warning('Elige la cuenta, el concepto y un monto válido.')
      return
    }
    if (!isTransfer && form.tipo === 'ingreso' && !form.destino) {
      notices.warning('Elige a qué parte va dirigido el ingreso.')
      return
    }
    if (form.destino === 'participantes' && (!form.evento_id || !form.persona_id)) {
      notices.warning('Elige la actividad y el participante.')
      return
    }
    if (isTransfer && (!form.cuenta_destino_id || form.cuenta_destino_id === form.cuenta_bancaria_id)) {
      notices.warning('Elige una cuenta destino distinta a la de origen.')
      return
    }
    if (isTransfer) {
      const disponible = Number(
        data.cuentas_bancarias.find((cuenta) => String(cuenta.id) === form.cuenta_bancaria_id)?.saldo,
      ) || 0
      if (monto > disponible) {
        notices.warning(`Solo hay ${formatMoney(disponible)} disponibles en la cuenta de origen.`)
        return
      }
    }
    if (
      form.tipo === 'egreso' &&
      form.evento_id &&
      (form.destino === 'capital' || form.destino === 'diezmo' || form.destino === 'ofrenda')
    ) {
      const disponible = amountsForEvent(form.evento_id, data.eventos, data.actividades)[form.destino]
        .disponible
      if (monto > disponible) {
        notices.warning(
          `Solo hay ${formatMoney(disponible)} disponibles de ${destinoLabel(form.destino)} en esa actividad.`,
        )
        return
      }
    }
    setSaving(true)
    try {
      await finanzasApi.storeMovimiento({
        cuenta_bancaria_id: Number(form.cuenta_bancaria_id),
        cuenta_destino_id: isTransfer ? Number(form.cuenta_destino_id) : undefined,
        tipo: form.tipo,
        origen: isTransfer ? 'transferencia' : form.tipo === 'egreso' ? 'gasto' : 'manual',
        monto,
        concepto: form.concepto.trim(),
        destino: isTransfer ? null : form.destino || null,
        evento_id: isTransfer ? null : form.evento_id ? Number(form.evento_id) : null,
        persona_id:
          !isTransfer && form.destino === 'participantes' && form.persona_id
            ? Number(form.persona_id)
            : null,
      })
      notices.success(isTransfer ? 'Transferencia registrada.' : 'Movimiento registrado.')
      setForm((current) => ({ ...current, monto: '', concepto: '', destino: '', persona_id: '' }))
      setDrawerOpen(false)
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo registrar el movimiento'))
    } finally {
      setSaving(false)
    }
  }

  if (!canView) {
    return (
      <section className="admin-page">
        <AppPanel>
          <p className="app-panel__kicker">Finanzas</p>
          <h2 className="app-panel__title">Sin acceso</h2>
          <p className="app-panel__subtitle">No tienes permiso para ver la caja del club.</p>
        </AppPanel>
      </section>
    )
  }

  const maxBar = Math.max(
    1,
    ...data.serie_mensual.map((row) => Math.max(row.ingresos, row.gastos)),
  )
  const ingresosDist = shownParts.reduce((sum, part) => sum + part.amount, 0)

  return (
    <section className="admin-page admin-page--finanzas">
      <div className="finanzas">
        {loading ? <p className="app-panel__muted">Cargando finanzas…</p> : null}

        <div className="finanzas__kpis">
          <article className="finanzas__kpi is-period">
            <div className="finanzas__kpi-head">
              <SummaryIcon name="calendar" tone="gold" />
              <span>Periodo</span>
            </div>
            <div className="finanzas__period">
              <label>
                Desde
                <input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
              </label>
              <label>
                Hasta
                <input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
              </label>
            </div>
            {canUpdate ? (
              <button type="button" className="app-panel__btn--ghost" onClick={() => setDrawerOpen(true)}>
                Registrar movimiento
              </button>
            ) : null}
          </article>
          <KpiCard
            tone="gold"
            icon="wallet"
            label="Disponible en el club"
            value={data.kpis.disponible}
            hint="Saldo actual en caja"
          />
          <DistribucionKpi parts={data.distribucion} />
          <KpiCard
            tone="ok"
            icon="coins"
            label="Ingresos totales"
            value={data.kpis.ingresos}
            hint={`Abonos y entradas · ${data.kpis.actividades} actividades`}
          />
          <KpiCard
            tone="danger"
            icon="pulse"
            label="Gastos totales"
            value={data.kpis.gastos}
            hint={`${data.kpis.conceptos_gasto} movimientos de salida`}
          />
        </div>

        <AppTabs
          label="Secciones de finanzas"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'resumen', label: 'Resumen' },
            { id: 'actividades', label: 'Actividades' },
            { id: 'movimientos', label: 'Movimientos de caja' },
          ]}
        >
          {tab === 'resumen' ? (
            <div className="finanzas__grid">
              <div className="finanzas__main">
                <section className="finanzas__card">
                  <h3>Distribución de lo recibido</h3>
                  <div className="finanzas__split">
                    <div
                      className={`finanzas__donut${donutFlash ? ' is-flash' : ''}`}
                      style={{ ['--finanzas-donut' as string]: donutStyle(shownParts) }}
                      role="img"
                      aria-label="Distribución de ingresos"
                    >
                      <div className="finanzas__donut-center">
                        <strong>{formatMoney(ingresosDist || data.kpis.ingresos)}</strong>
                        <span>Total</span>
                      </div>
                    </div>
                    <ul className="finanzas__legend">
                      {shownParts.map((part) => (
                        <LegendRow
                          key={part.key}
                          part={part}
                          watch={data.distribucion.find((item) => item.key === part.key)?.amount ?? 0}
                        />
                      ))}
                      {data.distribucion.length === 0 ? (
                        <li>
                          <span className="finanzas__swatch is-muted" aria-hidden="true" />
                          <span>
                            <strong>Sin distribución aún</strong>
                            <small>Aparece cuando hay abonos aprobados</small>
                          </span>
                          <em>{formatMoney(0)}</em>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </section>

                <section className="finanzas__card">
                  <h3>Ingresos vs gastos</h3>
                  <div className="finanzas__bars" role="img" aria-label="Ingresos y gastos por mes">
                    {data.serie_mensual.map((row) => (
                      <div key={row.mes} className="finanzas__bar-col">
                        <div className="finanzas__bar-pair">
                          <span
                            className="is-in"
                            style={{ height: `${Math.max(4, (row.ingresos / maxBar) * 100)}%` }}
                            title={`Ingresos ${formatMoney(row.ingresos)}`}
                          />
                          <span
                            className="is-out"
                            style={{ height: `${Math.max(4, (row.gastos / maxBar) * 100)}%` }}
                            title={`Gastos ${formatMoney(row.gastos)}`}
                          />
                        </div>
                        <small>{row.label}</small>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="finanzas__side">
                <section className="finanzas__card">
                  <h3>Saldo en cuentas del club</h3>
                  <ul className="finanzas__accounts">
                    {data.cuentas.map((cuenta) => (
                      <AccountRow key={cuenta.id} cuenta={cuenta} />
                    ))}
                  </ul>
                  <p className="finanzas__total">
                    <span>Total disponible</span>
                    <strong>
                      <AnimatedMoney value={data.kpis.disponible} />
                    </strong>
                  </p>
                </section>

                <section className="finanzas__card">
                  <h3>Últimos movimientos</h3>
                  <ul className="finanzas__moves">
                    {data.movimientos.slice(0, 8).map((mov) => (
                      <MovimientoRow
                        key={mov.id}
                        mov={mov}
                        fresh={freshMoves.has(mov.id)}
                        canDelete={canDeleteMovimiento}
                        deleting={deletingId === mov.id}
                        onDelete={(item) => void onDeleteMovimiento(item)}
                      />
                    ))}
                    {data.movimientos.length === 0 ? (
                      <li>
                        <span>Todavía no hay movimientos en el periodo.</span>
                        <strong>{formatMoney(0)}</strong>
                      </li>
                    ) : null}
                  </ul>
                </section>
              </aside>
            </div>
          ) : null}

          {tab === 'actividades' ? (
            <section className="finanzas__card">
              <h3>Por actividad</h3>
              <ul className="finanzas__acts">
                {data.actividades.map((act) => (
                  <ActividadRow key={act.id} act={act} />
                ))}
                {data.actividades.length === 0 ? (
                  <li className="finanzas__act is-empty">
                    <span>No hay abonos en el periodo seleccionado.</span>
                    <strong>{formatMoney(0)}</strong>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {tab === 'movimientos' ? (
            <section className="finanzas__card">
              <h3>Movimientos de caja</h3>
              <ul className="finanzas__moves">
                {data.movimientos.map((mov) => (
                  <MovimientoRow
                    key={mov.id}
                    mov={mov}
                    fresh={freshMoves.has(mov.id)}
                    canDelete={canDeleteMovimiento}
                    deleting={deletingId === mov.id}
                    onDelete={(item) => void onDeleteMovimiento(item)}
                  />
                ))}
                {data.movimientos.length === 0 ? (
                  <li>
                    <span>Sin movimientos.</span>
                    <strong>{formatMoney(0)}</strong>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}
        </AppTabs>
      </div>

      <CreateDrawer
        open={drawerOpen && canUpdate}
        title="Movimiento de caja"
        subtitle="Ingreso, gasto o transferencia"
        placement="bottom"
        onClose={() => setDrawerOpen(false)}
      >
        <MovimientoForm
          form={form}
          saving={saving}
          cuentasBancarias={data.cuentas_bancarias ?? []}
          eventos={data.eventos}
          actividades={data.actividades}
          onChange={setForm}
          onSubmit={(event) => void onSubmitMovimiento(event)}
        />
      </CreateDrawer>
    </section>
  )
}

function KpiCard({
  tone,
  icon,
  label,
  value,
  hint,
}: {
  tone: SummaryTone
  icon: AdminIconName
  label: string
  value: number
  hint: string
}) {
  const flash = useFlash(value)
  return (
    <article className={`finanzas__kpi is-${tone}${flash ? ' is-flash' : ''}`}>
      <div className="finanzas__kpi-head">
        <SummaryIcon name={icon} tone={tone} />
        <span>{label}</span>
      </div>
      <strong>
        <AnimatedMoney value={value} />
      </strong>
      <small>{hint}</small>
    </article>
  )
}

function DistribucionKpi({ parts }: { parts: FinanzasParte[] }) {
  const participantes = partAmount(parts, 'participantes')
  const club = partAmount(parts, 'club')
  const extras = partAmount(parts, 'extras')
  const capital = partAmount(parts, 'capital')
  const total = participantes + club + extras + capital
  const flash = useFlash(`${participantes}|${club}|${extras}|${capital}`)
  return (
    <article className={`finanzas__kpi is-info is-split${flash ? ' is-flash' : ''}`}>
      <div className="finanzas__kpi-head">
        <SummaryIcon name="pie" tone="info" />
        <span>Distribución</span>
      </div>
      <strong>
        <AnimatedMoney value={total} />
      </strong>
      <ul className="finanzas__kpi-pair">
        <li>
          <span>Participantes</span>
          <strong>
            <AnimatedMoney value={participantes} />
          </strong>
        </li>
        <li>
          <span>Club</span>
          <strong>
            <AnimatedMoney value={club} />
          </strong>
        </li>
        <li>
          <span>Otros</span>
          <strong>
            <AnimatedMoney value={extras} />
          </strong>
        </li>
        <li>
          <span>Capital</span>
          <strong>
            <AnimatedMoney value={capital} />
          </strong>
        </li>
      </ul>
    </article>
  )
}

function LegendRow({ part, watch }: { part: FinanzasParte; watch: number }) {
  const flash = useFlash(watch)
  return (
    <li className={flash ? 'is-flash' : undefined}>
      <span className={`finanzas__swatch is-${part.tone}`} aria-hidden="true" />
      <span>
        <strong>{part.label}</strong>
        <small>{formatPercent(part.percent)}</small>
      </span>
      <em>{formatMoney(part.amount)}</em>
    </li>
  )
}

function AccountRow({ cuenta }: { cuenta: FinanzasCuenta }) {
  const flash = useFlash(cuenta.saldo)
  return (
    <li className={flash ? 'is-flash' : undefined}>
      <span>{cuenta.nombre}</span>
      <strong>
        <AnimatedMoney value={cuenta.saldo} />
      </strong>
    </li>
  )
}

function planteadoOf(act: FinanzasActividad, key: (typeof ACTIVIDAD_PARTES)[number]['key']): number {
  return Number(act.planteado?.[key] ?? act[key]) || 0
}

function ActividadRow({ act }: { act: FinanzasActividad }) {
  const flash = useFlash(act.abonado)
  const logo = resolveFileUrl(act.image_url)
  const fecha = formatDate(act.starts_at)
  return (
    <li className={`finanzas__act${flash ? ' is-flash' : ''}`}>
      <header>
        {logo ? (
          <span className="finanzas__act-logo" aria-hidden="true">
            <img src={logo} alt="" />
          </span>
        ) : null}
        <span className="finanzas__act-who">
          <strong>{act.nombre}</strong>
          {fecha ? <small>{fecha}</small> : null}
        </span>
        <em>
          <AnimatedMoney value={act.abonado} />
        </em>
      </header>
      <ul className="finanzas__act-parts">
        {ACTIVIDAD_PARTES.filter((part) => part.key !== 'extras' || act.extras !== 0).map((part) => {
          const disponible = act[part.key]
          const planteado = planteadoOf(act, part.key)
          return (
            <li key={part.key}>
              <span className={`finanzas__swatch is-${part.tone}`} aria-hidden="true" />
              <span>{part.label}</span>
              <strong>
                {formatMoney(disponible)}
                <small> / {formatMoney(planteado)}</small>
              </strong>
            </li>
          )
        })}
      </ul>
      <p className="finanzas__act-hint">Disponible / planteado</p>
    </li>
  )
}

function movimientoLabel(mov: FinanzasMovimiento): string {
  const concepto = mov.concepto.trim()
  const evento = mov.evento_nombre?.trim()
  if (!evento) return concepto
  if (concepto.toLowerCase().includes(evento.toLowerCase())) return concepto
  return `${concepto} · ${evento}`
}

function MovimientoRow({
  mov,
  fresh = false,
  canDelete = false,
  deleting = false,
  onDelete,
}: {
  mov: FinanzasMovimiento
  fresh?: boolean
  canDelete?: boolean
  deleting?: boolean
  onDelete?: (mov: FinanzasMovimiento) => void
}) {
  return (
    <li className={fresh ? 'is-new' : undefined}>
      <span>{movimientoLabel(mov)}</span>
      <span className="finanzas__move-end">
        <strong className={mov.tipo === 'egreso' ? 'is-out' : 'is-in'}>
          {mov.tipo === 'egreso' ? '-' : '+'}
          {formatMoney(mov.monto)}
        </strong>
        {canDelete ? (
          <button
            type="button"
            className="finanzas__move-del"
            disabled={deleting}
            onClick={() => onDelete?.(mov)}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        ) : null}
      </span>
    </li>
  )
}

function MovimientoForm({
  form,
  saving,
  cuentasBancarias,
  eventos,
  actividades,
  onChange,
  onSubmit,
}: {
  form: MovimientoFormState
  saving: boolean
  cuentasBancarias: FinanzasResumen['cuentas_bancarias']
  eventos: FinanzasResumen['eventos']
  actividades: FinanzasResumen['actividades']
  onChange: (next: MovimientoFormState) => void
  onSubmit: (event: FormEvent) => void
}) {
  const isTransfer = form.tipo === 'transferencia'
  const showDirigir = !isTransfer
  const amounts =
    form.tipo === 'egreso' && form.evento_id
      ? amountsForEvent(form.evento_id, eventos, actividades)
      : null
  const destConcepto =
    form.destino === 'capital' || form.destino === 'diezmo' || form.destino === 'ofrenda'
      ? form.destino
      : null
  const disponibleActual = destConcepto && amounts ? amounts[destConcepto].disponible : null
  const showEgresoMontos = Boolean(amounts && destConcepto)
  const formRef = useRef(form)
  const onChangeRef = useRef(onChange)
  formRef.current = form
  onChangeRef.current = onChange

  useEffect(() => {
    if (disponibleActual === null || !destConcepto) return
    const currentForm = formRef.current
    const montos = amountsForEvent(currentForm.evento_id, eventos, actividades)[destConcepto]
    const suggested = moneyDigits(montoConcepto(montos))
    const current = Number(currentForm.monto)
    if (!suggested) return
    if (!Number.isFinite(current) || current <= 0 || current > disponibleActual) {
      if (currentForm.monto !== suggested) onChangeRef.current({ ...currentForm, monto: suggested })
    }
  }, [actividades, destConcepto, disponibleActual, eventos])
  const participantes =
    eventos.find((evento) => String(evento.id) === form.evento_id)?.participantes ?? []
  const showParticipante = showDirigir && form.destino === 'participantes'
  const canTransfer = cuentasBancarias.length >= 2
  const origen = cuentasBancarias.find((cuenta) => String(cuenta.id) === form.cuenta_bancaria_id)
  const disponibleOrigen = Number(origen?.saldo) || 0
  const destinos = cuentasBancarias.filter((cuenta) => String(cuenta.id) !== form.cuenta_bancaria_id)

  function setTipo(tipo: MovimientoTipo) {
    if (tipo === 'transferencia') {
      const origenId = form.cuenta_bancaria_id
      const other = cuentasBancarias.find((cuenta) => String(cuenta.id) !== origenId)
      const destinoId =
        form.cuenta_destino_id && form.cuenta_destino_id !== origenId
          ? form.cuenta_destino_id
          : other
            ? String(other.id)
            : ''
      onChange({
        ...form,
        tipo,
        evento_id: '',
        destino: '',
        persona_id: '',
        cuenta_destino_id: destinoId,
        concepto: transferenciaConcepto(cuentasBancarias, origenId, destinoId),
      })
      return
    }
    onChange(applyDestino({ ...form, tipo, cuenta_destino_id: '' }, form.destino, eventos, actividades))
  }

  function setOrigen(origenId: string) {
    if (!isTransfer) {
      onChange({ ...form, cuenta_bancaria_id: origenId })
      return
    }
    let destinoId = form.cuenta_destino_id === origenId ? '' : form.cuenta_destino_id
    if (!destinoId) {
      const other = cuentasBancarias.find((cuenta) => String(cuenta.id) !== origenId)
      destinoId = other ? String(other.id) : ''
    }
    onChange({
      ...form,
      cuenta_bancaria_id: origenId,
      cuenta_destino_id: destinoId,
      concepto: transferenciaConcepto(cuentasBancarias, origenId, destinoId),
    })
  }

  function setCuentaDestino(destinoId: string) {
    onChange({
      ...form,
      cuenta_destino_id: destinoId,
      concepto: transferenciaConcepto(cuentasBancarias, form.cuenta_bancaria_id, destinoId),
    })
  }

  function setEvento(eventoId: string) {
    const personas = eventos.find((evento) => String(evento.id) === eventoId)?.participantes ?? []
    const personaId = personas.some((persona) => String(persona.id) === form.persona_id)
      ? form.persona_id
      : ''
    onChange(applyDestino({ ...form, evento_id: eventoId }, form.destino, eventos, actividades, personaId))
  }

  function setDestinoClave(destino: '' | DestinoKey) {
    onChange(applyDestino(form, destino, eventos, actividades))
  }

  function setPersona(personaId: string) {
    onChange(applyDestino(form, form.destino, eventos, actividades, personaId))
  }

  return (
    <form className="finanzas__form" onSubmit={onSubmit}>
      <div className="finanzas__form-row">
        <label>
          Tipo
          <select
            value={form.tipo}
            onChange={(event) => setTipo(event.target.value as MovimientoTipo)}
          >
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Gasto / egreso</option>
            <option value="transferencia" disabled={!canTransfer}>
              Transferencia entre cuentas
            </option>
          </select>
        </label>
        <label>
          {isTransfer ? 'Cuenta origen' : 'Cuenta bancaria'}
          <select
            value={form.cuenta_bancaria_id}
            onChange={(event) => setOrigen(event.target.value)}
            required
            disabled={cuentasBancarias.length === 0}
          >
            <option value="">Elige una cuenta</option>
            {cuentasBancarias.map((cuenta) => (
              <option key={cuenta.id} value={cuenta.id}>
                {cuentaOpcionLabel(cuenta)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {cuentasBancarias.length === 0 ? (
        <p className="app-panel__muted">
          Agrega una cuenta en Configuración → Cuentas bancarias para poder guardar el movimiento.
        </p>
      ) : null}
      {isTransfer && !canTransfer ? (
        <p className="app-panel__muted">
          Para transferir necesitas al menos dos cuentas bancarias activas.
        </p>
      ) : null}
      {isTransfer ? (
        <>
          <div className="finanzas__form-row">
            <label>
              Cuenta destino
              <select
                value={form.cuenta_destino_id}
                onChange={(event) => setCuentaDestino(event.target.value)}
                required
                disabled={destinos.length === 0}
              >
                <option value="">Elige la cuenta destino</option>
                {destinos.map((cuenta) => (
                  <option key={cuenta.id} value={cuenta.id}>
                    {cuentaOpcionLabel(cuenta)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Monto
              <NumberPadInput
                title="Monto a transferir"
                min={1}
                maxDigits={10}
                format={formatMoney}
                value={form.monto}
                disabled={saving || disponibleOrigen <= 0}
                onChange={(monto) => onChange({ ...form, monto })}
              />
            </label>
          </div>
          <p className="app-panel__muted">
            Disponible en origen: {formatMoney(disponibleOrigen)}. Se registra una salida en esa
            cuenta y una entrada en la destino.
          </p>
        </>
      ) : (
        <>
          <div className="finanzas__form-row">
            <label>
              {showParticipante || form.tipo === 'egreso' ? 'Actividad' : 'Actividad (opcional)'}
              <select
                value={form.evento_id}
                onChange={(event) => setEvento(event.target.value)}
                required={showParticipante}
              >
                <option value="">Sin actividad</option>
                {eventos.map((evento) => (
                  <option key={evento.id} value={evento.id}>
                    {evento.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {form.tipo === 'ingreso' ? 'Dirigir a' : 'Sale de'}
              <select
                value={form.destino}
                onChange={(event) => setDestinoClave(event.target.value as '' | DestinoKey)}
                required={form.tipo === 'ingreso'}
              >
                <option value="">{form.tipo === 'ingreso' ? 'Elige el destino' : 'Otro / personalizado'}</option>
                {DESTINOS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {amounts && (item.key === 'capital' || item.key === 'diezmo' || item.key === 'ofrenda')
                      ? conceptoOptionLabel(item.label, amounts[item.key])
                      : item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {showParticipante ? (
            <label>
              Participante
              <select
                value={form.persona_id}
                onChange={(event) => setPersona(event.target.value)}
                required
                disabled={!form.evento_id || participantes.length === 0}
              >
                <option value="">
                  {!form.evento_id
                    ? 'Elige primero la actividad'
                    : participantes.length === 0
                      ? 'Esta actividad no tiene participantes'
                      : 'Elige el participante'}
                </option>
                {participantes.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </>
      )}
      {showDirigir && form.destino === 'participantes' ? (
        <p className="app-panel__muted">
          {form.tipo === 'egreso'
            ? 'El gasto sale de la ganancia de esa persona: es una salida en caja y se descuenta de su parte.'
            : 'El ingreso entra a caja y se suma a la ganancia de esa persona, sin pasar por diezmo, ofrenda ni capital.'}
        </p>
      ) : null}
      {showEgresoMontos ? (
        <p className="app-panel__muted">
          {form.destino && amounts && (form.destino === 'capital' || form.destino === 'diezmo' || form.destino === 'ofrenda')
            ? `${destinoLabel(form.destino)}: proyectado ${formatMoney(amounts[form.destino].proyectado)} · disponible ${formatMoney(amounts[form.destino].disponible)}. El monto se llena con lo disponible y puedes ajustarlo.`
            : 'Elige capital, diezmo u ofrenda para ver lo proyectado y lo que queda disponible en esta actividad.'}
        </p>
      ) : null}
      {showDirigir && form.tipo === 'ingreso' && form.destino && form.destino !== 'participantes' ? (
        <p className="app-panel__muted">
          Este ingreso adicional se suma a {destinoLabel(form.destino).toLowerCase()} en la distribución.
        </p>
      ) : null}
      <label>
        Concepto
        <input
          value={form.concepto}
          onChange={(event) => onChange({ ...form, concepto: event.target.value })}
          placeholder={
            isTransfer
              ? 'Se completa al elegir las cuentas'
              : showDirigir
                ? 'Se completa al elegir el destino'
                : 'Ej. Compra de materiales'
          }
          required
        />
      </label>
      {isTransfer ? null : (
        <label>
          Monto
          <NumberPadInput
            title="Monto del movimiento"
            min={1}
            maxDigits={10}
            format={formatMoney}
            value={form.monto}
            disabled={saving}
            onChange={(monto) => onChange({ ...form, monto })}
          />
        </label>
      )}
      <button
        type="submit"
        className="app-panel__btn--primary"
        disabled={
          saving ||
          cuentasBancarias.length === 0 ||
          (isTransfer && (!canTransfer || disponibleOrigen <= 0))
        }
      >
        {saving ? 'Guardando…' : isTransfer ? 'Transferir' : 'Guardar movimiento'}
      </button>
    </form>
  )
}
