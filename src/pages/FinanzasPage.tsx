import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../api/client'
import { finanzasApi } from '../api/finanzas'
import type { FinanzasMovimiento, FinanzasParte, FinanzasResumen } from '../api/types'
import { canAccessClubFinanzas, clubAccessFromUser, isSuperAdminUser } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import { AppPanel } from '../theme/AppPanel'
import { AppTabs } from '../theme/AppTabs'
import { CreateDrawer } from '../theme/CreateDrawer'
import { NumberPadInput } from '../theme/NumberPad'
import { useNotice } from '../theme/NoticeProvider'
import '../theme/finanzas.css'

type TabId = 'resumen' | 'actividades' | 'movimientos' | 'registrar'

function formatMoney(value: number): string {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
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
  if (tone === 'info') return 'var(--panel-icon)'
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
  const ctx = auth.user?.contexto
  const access = clubAccessFromUser(auth.user, auth.can)
  const canView =
    canAccessClubFinanzas(access) || auth.can('finanzas.view') || auth.can('abonos.view')
  const canUpdate = canAccessClubFinanzas(access) || auth.can('finanzas.update')
  const canDeleteMovimiento = isSuperAdminUser(auth.user)

  const bounds = useMemo(() => yearBounds(), [])
  const [desde, setDesde] = useState(bounds.desde)
  const [hasta, setHasta] = useState(bounds.hasta)
  const [cuentaBancariaId, setCuentaBancariaId] = useState<number | null>(null)
  const [tab, setTab] = useState<TabId>('resumen')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<FinanzasResumen>(() => emptyResumen(bounds.desde, bounds.hasta))
  const [saving, setSaving] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    cuenta_id: '',
    tipo: 'egreso' as 'ingreso' | 'egreso',
    monto: '',
    concepto: '',
    evento_id: '',
  })

  useEffect(() => {
    if (!canView) return undefined
    let cancelled = false
    setLoading(true)
    finanzasApi
      .resumen({ desde, hasta, cuentaBancariaId })
      .then((next) => {
        if (!cancelled) setData(next)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar finanzas'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canView, desde, hasta, cuentaBancariaId, notices])

  useEffect(() => {
    if (!form.cuenta_id && data.cuentas[0]) {
      setForm((current) => ({ ...current, cuenta_id: String(data.cuentas[0].id) }))
    }
  }, [data.cuentas, form.cuenta_id])

  async function reload() {
    const next = await finanzasApi.resumen({ desde, hasta, cuentaBancariaId })
    setData(next)
  }

  async function onDeleteMovimiento(mov: FinanzasMovimiento) {
    if (!canDeleteMovimiento || deletingId) return
    if (!window.confirm(`¿Eliminar el movimiento “${mov.concepto}”? Esta acción no se puede deshacer.`)) return
    setDeletingId(mov.id)
    try {
      await finanzasApi.deleteMovimiento(mov.id)
      notices.success('Movimiento eliminado.')
      await reload()
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
    if (!form.cuenta_id || !form.concepto.trim() || !Number.isFinite(monto) || monto <= 0) {
      notices.warning('Completa cuenta, concepto y un monto válido.')
      return
    }
    setSaving(true)
    try {
      await finanzasApi.storeMovimiento({
        cuenta_id: Number(form.cuenta_id),
        tipo: form.tipo,
        origen: form.tipo === 'egreso' ? 'gasto' : 'manual',
        monto,
        concepto: form.concepto.trim(),
        evento_id: form.evento_id ? Number(form.evento_id) : null,
      })
      notices.success('Movimiento registrado.')
      setForm((current) => ({ ...current, monto: '', concepto: '' }))
      setDrawerOpen(false)
      await reload()
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
  const ingresosDist = data.distribucion.reduce((sum, part) => sum + part.amount, 0)

  return (
    <section className="admin-page admin-page--finanzas">
      <div className="finanzas">
        <AppPanel>
          <div className="finanzas__head">
            <div>
              <p className="app-panel__kicker">Club</p>
              <h2 className="app-panel__title">Finanzas del club</h2>
              <p className="app-panel__subtitle">
                Resumen general de ingresos, gastos y distribución de todas las actividades.
              </p>
            </div>
            <div className="finanzas__filters">
              <label>
                Desde
                <input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
              </label>
              <label>
                Hasta
                <input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
              </label>
              <label>
                Cuenta bancaria
                <select
                  value={cuentaBancariaId ?? ''}
                  onChange={(event) =>
                    setCuentaBancariaId(event.target.value ? Number(event.target.value) : null)
                  }
                >
                  <option value="">Todas las cuentas</option>
                  {(data.cuentas_bancarias ?? []).map((cuenta) => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre}
                    </option>
                  ))}
                </select>
              </label>
              {canUpdate ? (
                <button type="button" className="app-panel__btn--primary" onClick={() => setDrawerOpen(true)}>
                  Registrar movimiento
                </button>
              ) : null}
            </div>
          </div>
        </AppPanel>

        {loading ? <p className="app-panel__muted">Cargando finanzas…</p> : null}

        <div className="finanzas__kpis">
          <article className="finanzas__kpi is-ok">
            <span>Ingresos totales</span>
            <strong>{formatMoney(data.kpis.ingresos)}</strong>
            <small>Abonos y entradas · {data.kpis.actividades} actividades</small>
          </article>
          <article className="finanzas__kpi is-danger">
            <span>Gastos totales</span>
            <strong>{formatMoney(data.kpis.gastos)}</strong>
            <small>{data.kpis.conceptos_gasto} movimientos de salida</small>
          </article>
          <article className="finanzas__kpi is-gold">
            <span>Disponible en el club</span>
            <strong>{formatMoney(data.kpis.disponible)}</strong>
            <small>Saldo actual en caja</small>
          </article>
          <article className="finanzas__kpi is-info">
            <span>Por distribuir</span>
            <strong>{formatMoney(data.kpis.por_distribuir)}</strong>
            <small>Participantes, club y otros</small>
          </article>
        </div>

        <AppTabs
          label="Secciones de finanzas"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'resumen', label: 'Resumen' },
            { id: 'actividades', label: 'Actividades' },
            { id: 'movimientos', label: 'Movimientos de caja' },
            ...(canUpdate ? [{ id: 'registrar' as const, label: 'Registrar' }] : []),
          ]}
        >
          {tab === 'resumen' ? (
            <div className="finanzas__grid">
              <div className="finanzas__main">
                <section className="finanzas__card">
                  <h3>Distribución de lo recibido</h3>
                  <div className="finanzas__split">
                    <div
                      className="finanzas__donut"
                      style={{ ['--finanzas-donut' as string]: donutStyle(data.distribucion) }}
                      role="img"
                      aria-label="Distribución de ingresos"
                    >
                      <div className="finanzas__donut-center">
                        <strong>{formatMoney(ingresosDist || data.kpis.ingresos)}</strong>
                        <span>Total</span>
                      </div>
                    </div>
                    <ul className="finanzas__legend">
                      {data.distribucion.map((part) => (
                        <li key={part.key}>
                          <span className={`finanzas__swatch is-${part.tone}`} aria-hidden="true" />
                          <span>
                            <strong>{part.label}</strong>
                            <small>{part.percent}%</small>
                          </span>
                          <em>{formatMoney(part.amount)}</em>
                        </li>
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
                      <li key={cuenta.id}>
                        <span>{cuenta.nombre}</span>
                        <strong>{formatMoney(cuenta.saldo)}</strong>
                      </li>
                    ))}
                  </ul>
                  <p className="finanzas__total">
                    <span>Total disponible</span>
                    <strong>{formatMoney(data.kpis.disponible)}</strong>
                  </p>
                </section>

                <section className="finanzas__card">
                  <h3>Últimos movimientos</h3>
                  <ul className="finanzas__moves">
                    {data.movimientos.slice(0, 8).map((mov) => (
                      <MovimientoRow
                        key={mov.id}
                        mov={mov}
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
                  <li key={act.id}>
                    <span>
                      <strong style={{ display: 'block', color: 'var(--panel-title)' }}>{act.nombre}</strong>
                      Diezmo {formatMoney(act.diezmo)} · Ofrenda {formatMoney(act.ofrenda)} · Miembros{' '}
                      {formatMoney(act.participantes)}
                    </span>
                    <strong>{formatMoney(act.abonado)}</strong>
                  </li>
                ))}
                {data.actividades.length === 0 ? (
                  <li>
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

          {tab === 'registrar' && canUpdate ? (
            <section className="finanzas__card">
              <h3>Registrar ingreso o gasto</h3>
              <MovimientoForm
                form={form}
                saving={saving}
                cuentas={data.cuentas}
                eventos={data.eventos}
                onChange={setForm}
                onSubmit={(event) => void onSubmitMovimiento(event)}
              />
            </section>
          ) : null}
        </AppTabs>
      </div>

      <CreateDrawer
        open={drawerOpen && canUpdate}
        title="Movimiento de caja"
        subtitle="Ingreso o gasto"
        placement="bottom"
        onClose={() => setDrawerOpen(false)}
      >
        <MovimientoForm
          form={form}
          saving={saving}
          cuentas={data.cuentas}
          eventos={data.eventos}
          onChange={setForm}
          onSubmit={(event) => void onSubmitMovimiento(event)}
        />
      </CreateDrawer>
    </section>
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
  canDelete = false,
  deleting = false,
  onDelete,
}: {
  mov: FinanzasMovimiento
  canDelete?: boolean
  deleting?: boolean
  onDelete?: (mov: FinanzasMovimiento) => void
}) {
  return (
    <li>
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
  cuentas,
  eventos,
  onChange,
  onSubmit,
}: {
  form: {
    cuenta_id: string
    tipo: 'ingreso' | 'egreso'
    monto: string
    concepto: string
    evento_id: string
  }
  saving: boolean
  cuentas: FinanzasResumen['cuentas']
  eventos: FinanzasResumen['eventos']
  onChange: (next: typeof form) => void
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <form className="finanzas__form" onSubmit={onSubmit}>
      <div className="finanzas__form-row">
        <label>
          Tipo
          <select
            value={form.tipo}
            onChange={(event) => onChange({ ...form, tipo: event.target.value as 'ingreso' | 'egreso' })}
          >
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Gasto / egreso</option>
          </select>
        </label>
        <label>
          Cuenta
          <select
            value={form.cuenta_id}
            onChange={(event) => onChange({ ...form, cuenta_id: event.target.value })}
            required
          >
            {cuentas.map((cuenta) => (
              <option key={cuenta.id} value={cuenta.id}>
                {cuenta.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Concepto
        <input
          value={form.concepto}
          onChange={(event) => onChange({ ...form, concepto: event.target.value })}
          placeholder="Ej. Compra de materiales"
          required
        />
      </label>
      <div className="finanzas__form-row">
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
        <label>
          Actividad (opcional)
          <select
            value={form.evento_id}
            onChange={(event) => onChange({ ...form, evento_id: event.target.value })}
          >
            <option value="">Sin actividad</option>
            {eventos.map((evento) => (
              <option key={evento.id} value={evento.id}>
                {evento.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" className="app-panel__btn--primary" disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar movimiento'}
      </button>
    </form>
  )
}
