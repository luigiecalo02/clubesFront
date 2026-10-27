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

const EGRESO_CONCEPTOS = [
  { key: 'capital', label: 'Capital' },
  { key: 'diezmo', label: 'Diezmo' },
  { key: 'ofrenda', label: 'Ofrenda' },
] as const

type EgresoConceptoKey = (typeof EGRESO_CONCEPTOS)[number]['key']

type MovimientoFormState = {
  cuenta_bancaria_id: string
  tipo: 'ingreso' | 'egreso'
  monto: string
  concepto: string
  evento_id: string
  concepto_clave: '' | EgresoConceptoKey
}

function moneyDigits(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  return String(Math.round(value))
}

type ConceptoMontos = {
  proyectado: number
  recogido: number
}

function amountsForEvent(
  eventoId: string,
  eventos: FinanzasResumen['eventos'],
  actividades: FinanzasResumen['actividades'],
): Record<EgresoConceptoKey, ConceptoMontos> {
  const evento = eventos.find((item) => String(item.id) === eventoId)
  const actividad = actividades.find((item) => String(item.id) === eventoId)
  return {
    capital: {
      proyectado: Number(evento?.capital) || 0,
      recogido: Number(evento?.capital_recogido ?? actividad?.capital) || 0,
    },
    diezmo: {
      proyectado: Number(evento?.diezmo) || 0,
      recogido: Number(evento?.diezmo_recogido ?? actividad?.diezmo) || 0,
    },
    ofrenda: {
      proyectado: Number(evento?.ofrenda) || 0,
      recogido: Number(evento?.ofrenda_recogido ?? actividad?.ofrenda) || 0,
    },
  }
}

function montoConcepto(montos: ConceptoMontos): number {
  return montos.recogido > 0 ? montos.recogido : montos.proyectado
}

function conceptoOptionLabel(label: string, montos: ConceptoMontos): string {
  return `${label} · proyectado ${formatMoney(montos.proyectado)} · en caja ${formatMoney(montos.recogido)}`
}

function applyEgresoConcepto(
  form: MovimientoFormState,
  clave: '' | EgresoConceptoKey,
  eventos: FinanzasResumen['eventos'],
  actividades: FinanzasResumen['actividades'],
): MovimientoFormState {
  if (!clave || !form.evento_id) {
    return { ...form, concepto_clave: '' }
  }
  const evento = eventos.find((item) => String(item.id) === form.evento_id)
  const item = EGRESO_CONCEPTOS.find((row) => row.key === clave)
  if (!evento || !item) return { ...form, concepto_clave: clave }
  const monto = montoConcepto(amountsForEvent(form.evento_id, eventos, actividades)[clave])
  return {
    ...form,
    concepto_clave: clave,
    concepto: `${item.label} · ${evento.nombre}`,
    monto: moneyDigits(monto) || form.monto,
  }
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
    tipo: 'egreso',
    monto: '',
    concepto: '',
    evento_id: '',
    concepto_clave: '',
  })

  useEffect(() => {
    if (!canView) return undefined
    let cancelled = false
    setLoading(true)
    finanzasApi
      .resumen({ desde, hasta })
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
  }, [canView, desde, hasta, notices])

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

  async function reload() {
    const next = await finanzasApi.resumen({ desde, hasta })
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
    if (!form.cuenta_bancaria_id || !form.concepto.trim() || !Number.isFinite(monto) || monto <= 0) {
      notices.warning('Elige la cuenta, el concepto y un monto válido.')
      return
    }
    setSaving(true)
    try {
      await finanzasApi.storeMovimiento({
        cuenta_bancaria_id: Number(form.cuenta_bancaria_id),
        tipo: form.tipo,
        origen: form.tipo === 'egreso' ? 'gasto' : 'manual',
        monto,
        concepto: form.concepto.trim(),
        evento_id: form.evento_id ? Number(form.evento_id) : null,
      })
      notices.success('Movimiento registrado.')
      setForm((current) => ({ ...current, monto: '', concepto: '', concepto_clave: '' }))
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
        {loading ? <p className="app-panel__muted">Cargando finanzas…</p> : null}

        <div className="finanzas__kpis">
          <article className="finanzas__kpi is-period">
            <span>Periodo</span>
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
                cuentasBancarias={data.cuentas_bancarias ?? []}
                eventos={data.eventos}
                actividades={data.actividades}
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
  const showEgresoConcepto = form.tipo === 'egreso' && Boolean(form.evento_id)
  const amounts = showEgresoConcepto
    ? amountsForEvent(form.evento_id, eventos, actividades)
    : null

  function setTipo(tipo: 'ingreso' | 'egreso') {
    onChange({
      ...form,
      tipo,
      concepto_clave: tipo === 'egreso' ? form.concepto_clave : '',
    })
  }

  function setEvento(eventoId: string) {
    const next = { ...form, evento_id: eventoId }
    if (form.tipo !== 'egreso' || !eventoId || !form.concepto_clave) {
      onChange({ ...next, concepto_clave: eventoId ? form.concepto_clave : '' })
      return
    }
    onChange(applyEgresoConcepto(next, form.concepto_clave, eventos, actividades))
  }

  function setConceptoClave(clave: '' | EgresoConceptoKey) {
    onChange(applyEgresoConcepto(form, clave, eventos, actividades))
  }

  return (
    <form className="finanzas__form" onSubmit={onSubmit}>
      <div className="finanzas__form-row">
        <label>
          Tipo
          <select
            value={form.tipo}
            onChange={(event) => setTipo(event.target.value as 'ingreso' | 'egreso')}
          >
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Gasto / egreso</option>
          </select>
        </label>
        <label>
          Cuenta bancaria
          <select
            value={form.cuenta_bancaria_id}
            onChange={(event) => onChange({ ...form, cuenta_bancaria_id: event.target.value })}
            required
            disabled={cuentasBancarias.length === 0}
          >
            <option value="">Elige una cuenta</option>
            {cuentasBancarias.map((cuenta) => (
              <option key={cuenta.id} value={cuenta.id}>
                {cuenta.nombre}
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
      <div className="finanzas__form-row">
        <label>
          {form.tipo === 'egreso' ? 'Actividad' : 'Actividad (opcional)'}
          <select value={form.evento_id} onChange={(event) => setEvento(event.target.value)}>
            <option value="">Sin actividad</option>
            {eventos.map((evento) => (
              <option key={evento.id} value={evento.id}>
                {evento.nombre}
              </option>
            ))}
          </select>
        </label>
        {showEgresoConcepto ? (
          <label>
            Concepto de la actividad
            <select
              value={form.concepto_clave}
              onChange={(event) => setConceptoClave(event.target.value as '' | EgresoConceptoKey)}
            >
              <option value="">Otro / personalizado</option>
              {EGRESO_CONCEPTOS.map((item) => (
                <option key={item.key} value={item.key}>
                  {amounts ? conceptoOptionLabel(item.label, amounts[item.key]) : item.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
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
      </div>
      {showEgresoConcepto ? (
        <p className="app-panel__muted">
          {form.concepto_clave && amounts
            ? `${EGRESO_CONCEPTOS.find((item) => item.key === form.concepto_clave)?.label}: proyectado ${formatMoney(amounts[form.concepto_clave].proyectado)} · en caja ${formatMoney(amounts[form.concepto_clave].recogido)}. El monto se llena con lo recogido y puedes ajustarlo.`
            : 'Elige capital, diezmo u ofrenda para ver lo proyectado y lo ya recogido en caja de esta actividad.'}
        </p>
      ) : null}
      <label>
        Concepto
        <input
          value={form.concepto}
          onChange={(event) => onChange({ ...form, concepto: event.target.value })}
          placeholder={showEgresoConcepto ? 'Se completa al elegir el concepto' : 'Ej. Compra de materiales'}
          required
        />
      </label>
      {showEgresoConcepto ? (
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
      ) : null}
      <button
        type="submit"
        className="app-panel__btn--primary"
        disabled={saving || cuentasBancarias.length === 0}
      >
        {saving ? 'Guardando…' : 'Guardar movimiento'}
      </button>
    </form>
  )
}
