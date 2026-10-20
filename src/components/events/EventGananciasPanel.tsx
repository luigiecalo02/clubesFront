import { useEffect, useState, type ReactNode } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import type { AdminIconName } from '../../admin/menu'
import { getApiErrorMessage } from '../../api/client'
import { settingsApi } from '../../api/settings'
import type { CuentaBancariaClub, EventoGananciaRegistro, GananciaEclesiastica } from '../../api/types'
import { useNotice } from '../../theme/NoticeProvider'
import { ServiceThumb } from '../services/ServiceVisual'

export type GananciaServicioLine = {
  id: number
  nombre: string
  precio: number
  image_url?: string | null
  icono?: string | null
  descripcion?: string | null
  tipo?: string | null
  totalRegistrado?: number
  gananciaUnidad?: number
}

type EventGananciasPanelProps = {
  value: string
  onChange: (id: string) => void
  cuentaBancariaId: string
  onCuentaBancariaChange: (id: string) => void
  services: GananciaServicioLine[]
  cantidades: Record<number, string>
  inversiones: Record<number, string>
  onInversion: (id: number, value: string) => void
  capital: string
  onCapital: (value: string) => void
  loadingServices?: boolean
  canChange?: boolean
  registro?: EventoGananciaRegistro | null
}

function formatPercent(value: number): string {
  return `${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%`
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function wholeAmount(value: string): number {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return 0
  return Math.round(amount)
}

function preferredId(items: GananciaEclesiastica[]): string {
  const preferred = items.find((item) => item.es_predeterminada) ?? items[0]
  return preferred ? String(preferred.id) : ''
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

type GainSlice = {
  key: string
  label: string
  detail: string
  percent: number
  amount: number
  tone: string
  icon: AdminIconName
  received?: number
}

let eclesiasticasCache: GananciaEclesiastica[] | null = null
let eclesiasticasRequest: Promise<GananciaEclesiastica[]> | null = null

function useEclesiasticas() {
  const notices = useNotice()
  const [items, setItems] = useState<GananciaEclesiastica[]>(eclesiasticasCache ?? [])
  const [loading, setLoading] = useState(eclesiasticasCache == null)

  useEffect(() => {
    if (eclesiasticasCache) {
      setItems(eclesiasticasCache)
      setLoading(false)
      return
    }

    let cancelled = false
    const request =
      eclesiasticasRequest ??
      settingsApi.eclesiasticas().then((next) => {
        eclesiasticasCache = next
        return next
      })
    eclesiasticasRequest = request
    request
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch((err) => {
        eclesiasticasRequest = null
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar la distribución de ganancias'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [notices])

  return { items, loading }
}

function resolveConfig(items: GananciaEclesiastica[], configId?: number | null): GananciaEclesiastica | null {
  if (configId != null) {
    const selected = items.find((item) => item.id === Number(configId))
    if (selected) return selected
  }
  return items.find((item) => item.es_predeterminada) ?? items[0] ?? null
}

export function repartoFromConfig(current: GananciaEclesiastica): IncomeReparto {
  const dist = current.distribucion ?? null
  return {
    ofrenda: current.ofrenda,
    diezmo: current.diezmo,
    resto: current.resto,
    miembros: dist?.miembros ?? 0,
    club: dist?.club ?? 0,
    extras: dist?.extras ?? 0,
  }
}

export function useIncomeReparto(configId?: number | null): IncomeReparto | null {
  const { items } = useEclesiasticas()
  const current = resolveConfig(items, configId)
  return current ? repartoFromConfig(current) : null
}

export type ProductGainLine = {
  id: number
  nombre: string
  qty: number
  capitalUnidad: number
  gananciaUnidad: number
}

export function productGainLines(
  lines: { id: number; nombre: string; qty: number }[],
  services: {
    id: number
    nombre?: string
    precio?: number | string | null
    inversion?: number | string | null
    cantidad_proyectada?: number | null
  }[],
): ProductGainLine[] {
  return lines.flatMap((line) => {
    if (line.qty <= 0) return []
    const service = services.find((item) => item.id === line.id)
    if (!service) return []
    const inversion = Number(service.inversion) || 0
    const proyectada = Number(service.cantidad_proyectada) || 0
    const precio = Math.round(Number(service.precio) || 0)
    const capitalUnidad = proyectada > 0 ? Math.round(inversion / proyectada) : 0
    return [
      {
        id: line.id,
        nombre: line.nombre || service.nombre || 'Producto',
        qty: line.qty,
        capitalUnidad,
        gananciaUnidad: Math.max(0, precio - capitalUnidad),
      },
    ]
  })
}

export function productGainTotal(lines: ProductGainLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty * line.gananciaUnidad, 0)
}

function incomeShare(total: number, percent: number): number {
  return Math.round((Math.max(0, total) * Math.max(0, percent)) / 100)
}

export type IncomeReparto = {
  ofrenda: number
  diezmo: number
  resto: number
  miembros: number
  club: number
  extras: number
}

function incomePartsFrom(reparto: IncomeReparto, ingreso: number) {
  const ofrenda = incomeShare(ingreso, reparto.ofrenda)
  const diezmo = incomeShare(ingreso, reparto.diezmo)
  const resto = Math.max(0, ingreso) - ofrenda - diezmo
  const participantes = incomeShare(resto, reparto.miembros)
  const club = reparto.extras > 0 ? incomeShare(resto, reparto.club) : resto - participantes
  const otros = reparto.extras > 0 ? resto - participantes - club : 0
  return [
    { key: 'ofrenda', label: 'Ofrenda', percent: reparto.ofrenda, amount: ofrenda },
    { key: 'diezmo', label: 'Diezmo', percent: reparto.diezmo, amount: diezmo },
    { key: 'resto', label: 'A repartir', percent: reparto.resto, amount: resto },
    { key: 'miembros', label: 'Participantes', percent: reparto.miembros, amount: participantes },
    { key: 'club', label: 'Club', percent: reparto.club, amount: club },
    { key: 'extras', label: 'Otros', percent: reparto.extras, amount: otros },
  ]
}

export function participantShare(reparto: IncomeReparto, ingreso: number, capital = 0): number {
  const base = Math.max(0, ingreso - Math.max(0, capital))
  return incomePartsFrom(reparto, base).find((part) => part.key === 'miembros')?.amount ?? 0
}

function incomeParts(current: GananciaEclesiastica, ingreso: number) {
  return incomePartsFrom(repartoFromConfig(current), ingreso)
}

function IncomeFigures({
  ingreso,
  capital = 0,
  capitalNote,
  lines = [],
  abonosByProduct = {},
  parts,
  shareOf,
}: {
  ingreso: number
  capital?: number
  capitalNote?: string
  lines?: ProductGainLine[]
  abonosByProduct?: Record<number, number>
  parts: ReturnType<typeof incomePartsFrom>
  shareOf?: (amount: number) => ReturnType<typeof incomePartsFrom>
}) {
  if (lines.length === 0 || !shareOf) {
    return (
      <div className="event-summary__income">
        <p>
          <span>Abonado</span>
          <strong>{formatMoney(ingreso)}</strong>
        </p>
        {capital > 0 ? (
          <p>
            <span>Capital{capitalNote ? ` · ${capitalNote}` : ''}</span>
            <strong>{formatMoney(capital)}</strong>
          </p>
        ) : null}
        {parts
          .filter((part) => part.percent > 0)
          .map((part) => (
            <p key={part.key}>
              <span>
                {part.label} {formatPercent(part.percent)}
              </span>
              <strong>{formatMoney(part.amount)}</strong>
            </p>
          ))}
      </div>
    )
  }

  const rows = lines.map((line) => {
    const gain = line.qty * line.gananciaUnidad
    return {
      line,
      capitalAmount: line.qty * line.capitalUnidad,
      gain,
      abonado: Math.max(0, Number(abonosByProduct[line.id]) || 0),
      parts: shareOf(gain).filter((part) => part.percent > 0),
    }
  })
  const partKeys = rows[0]?.parts ?? []
  const sumCapital = rows.reduce((sum, row) => sum + row.capitalAmount, 0)
  const sumGain = rows.reduce((sum, row) => sum + row.gain, 0)
  const sumVenta = sumCapital + sumGain
  const sumAbonadoProductos = rows.reduce((sum, row) => sum + row.abonado, 0)
  const sumParts = partKeys.map((part) => ({
    ...part,
    amount: rows.reduce((sum, row) => sum + (row.parts.find((item) => item.key === part.key)?.amount ?? 0), 0),
  }))

  return (
    <div
      className="event-summary__sheet"
      role="table"
      style={{ ['--sheet-cols' as string]: String(5 + partKeys.length), ['--sheet-rows' as string]: String(rows.length) }}
    >
      <div className="event-summary__sheet-head">
        <span role="columnheader">Producto</span>
        <span role="columnheader">Capital</span>
        <span role="columnheader">Ganancia</span>
        <span role="columnheader">Abonado</span>
        {partKeys.map((part) => (
          <span key={part.key} role="columnheader">
            {part.label} {formatPercent(part.percent)}
          </span>
        ))}
        <span role="columnheader">Sumatoria</span>
      </div>
      {rows.map((row) => (
        <div key={row.line.id} className="event-summary__sheet-row" role="row">
          <span role="cell" data-label="Producto" className="is-product">
            <strong>{row.line.nombre}</strong>
            <small>
              {row.line.qty} × {formatMoney(row.line.gananciaUnidad)}
            </small>
          </span>
          <span role="cell" data-label="Capital">
            <small>
              {row.line.qty} × {formatMoney(row.line.capitalUnidad)}
            </small>
            <strong>{formatMoney(row.capitalAmount)}</strong>
          </span>
          <span role="cell" data-label="Ganancia">
            <strong>{formatMoney(row.gain)}</strong>
          </span>
          <span role="cell" data-label="Abonado" className="is-abonado">
            <strong>{formatMoney(row.abonado)}</strong>
          </span>
          {row.parts.map((part) => (
            <span key={part.key} role="cell" data-label={`${part.label} ${formatPercent(part.percent)}`}>
              <strong>{formatMoney(part.amount)}</strong>
            </span>
          ))}
        </div>
      ))}
      <div className="event-summary__sheet-sum" role="cell" data-label="Sumatoria">
        <p>
          <span>Venta</span>
          <strong>{formatMoney(sumVenta)}</strong>
        </p>
        <p>
          <span>Capital</span>
          <strong>{formatMoney(sumCapital)}</strong>
        </p>
        <p>
          <span>Ganancia</span>
          <strong>{formatMoney(sumGain)}</strong>
        </p>
        <p>
          <span>Abonado productos</span>
          <strong>{formatMoney(sumAbonadoProductos)}</strong>
        </p>
        {sumParts.map((part) => (
          <p key={part.key}>
            <span>{part.label}</span>
            <strong>{formatMoney(part.amount)}</strong>
          </p>
        ))}
        <p className="is-paid">
          <span>Abonado</span>
          <strong>{formatMoney(ingreso)}</strong>
        </p>
      </div>
    </div>
  )
}

function ParticipantIncomeFromConfig({
  configId,
  ingreso,
  capital = 0,
  capitalNote,
  lines = [],
  abonosByProduct = {},
  base,
}: {
  configId?: number | null
  ingreso: number
  capital?: number
  capitalNote?: string
  lines?: ProductGainLine[]
  abonosByProduct?: Record<number, number>
  base: number
}) {
  const { items, loading } = useEclesiasticas()
  const current = resolveConfig(items, configId)
  if (loading && lines.length === 0) return <p className="event-summary__income-note">Cargando reparto…</p>
  if (loading) return <p className="event-summary__income-note">Cargando reparto…</p>
  if (!current) return null
  return (
    <IncomeFigures
      ingreso={ingreso}
      capital={capital}
      capitalNote={capitalNote}
      lines={lines}
      abonosByProduct={abonosByProduct}
      parts={incomeParts(current, base)}
      shareOf={(amount) => incomeParts(current, amount)}
    />
  )
}

export function ParticipantIncomeSplit({
  configId,
  ingreso,
  reparto,
  capital = 0,
  capitalNote,
  lines = [],
  abonosByProduct = {},
}: {
  configId?: number | null
  ingreso: number
  reparto?: IncomeReparto | null
  capital?: number
  capitalNote?: string
  lines?: ProductGainLine[]
  abonosByProduct?: Record<number, number>
}) {
  const base = lines.length > 0 ? Math.max(0, productGainTotal(lines)) : Math.max(0, ingreso - Math.max(0, capital))
  if (reparto) {
    return (
      <IncomeFigures
        ingreso={ingreso}
        capital={capital}
        capitalNote={capitalNote}
        lines={lines}
        abonosByProduct={abonosByProduct}
        parts={incomePartsFrom(reparto, base)}
        shareOf={(amount) => incomePartsFrom(reparto, amount)}
      />
    )
  }
  return (
    <ParticipantIncomeFromConfig
      configId={configId}
      ingreso={ingreso}
      capital={capital}
      capitalNote={capitalNote}
      lines={lines}
      abonosByProduct={abonosByProduct}
      base={base}
    />
  )
}

export function approvedAbonosByProduct(
  abonos: Array<{ monto?: number | null; estado?: string | null; producto_servicio_id?: number | null }> = [],
): Record<number, number> {
  const out: Record<number, number> = {}
  for (const abono of abonos) {
    if (abono.estado && abono.estado !== 'aprobado') continue
    const id = Number(abono.producto_servicio_id)
    if (!Number.isFinite(id) || id <= 0) continue
    out[id] = (out[id] ?? 0) + (Number(abono.monto) || 0)
  }
  return out
}

function GainCharts({
  current,
  registro,
  ingreso,
  children,
}: {
  current: GananciaEclesiastica
  registro?: EventoGananciaRegistro | null
  ingreso?: number
  children?: ReactNode
}) {
  const dist = current.distribucion ?? null
  const base = registro?.ganancia ?? 0
  const diezmo = registro?.diezmo ?? 0
  const ofrenda = registro?.ofrenda ?? 0
  const resto = registro?.resto ?? 0
  const parts = ingreso == null ? null : incomeParts(current, ingreso)
  const receivedOf = (key: string) => parts?.find((part) => part.key === key)?.amount
  return (
    <div className="event-ganancia__charts">
      <DistributionChart
        title="Distribución del 100% de la ganancia"
        subtitle="Así se reparte la ganancia de la actividad según la configuración actual."
        slices={[
          {
            key: 'ofrenda',
            label: 'Ofrenda',
            detail: 'de la ganancia',
            percent: current.ofrenda,
            amount: ofrenda,
            received: receivedOf('ofrenda'),
            tone: 'ofrenda',
            icon: 'star',
          },
          {
            key: 'diezmo',
            label: 'Diezmo',
            detail: 'de la ganancia',
            percent: current.diezmo,
            amount: diezmo,
            received: receivedOf('diezmo'),
            tone: 'diezmo',
            icon: 'coins',
          },
          {
            key: 'resto',
            label: 'Ganancia a repartir',
            detail: 'lo que queda después de diezmo y ofrenda',
            percent: current.resto,
            amount: resto,
            received: receivedOf('resto'),
            tone: 'resto',
            icon: 'chart',
          },
        ]}
      >
        {children}
      </DistributionChart>
      {dist ? (
        <DistributionChart
          title={`Distribución del ${formatPercent(current.resto)} de la ganancia`}
          subtitle={`${dist.nombre}. Este tramo es el que se reparte entre el club, los participantes y otros.`}
          slices={[
            {
              key: 'miembros',
              label: 'Participantes',
              detail: 'de la ganancia a repartir',
              percent: dist.miembros,
                  amount: registro?.participantes ?? 0,
              received: dist ? receivedOf('miembros') : undefined,
              tone: 'miembros',
              icon: 'group',
            },
            {
              key: 'club',
              label: 'Club',
              detail: 'de la ganancia a repartir',
              percent: dist.club,
                  amount: registro?.club ?? 0,
              received: dist ? receivedOf('club') : undefined,
              tone: 'club',
              icon: 'building',
            },
            {
              key: 'extras',
              label: 'Otros',
              detail: 'de la ganancia a repartir',
              percent: dist.extras,
                  amount: registro?.extras ?? 0,
              received: dist ? receivedOf('extras') : undefined,
              tone: 'extras',
              icon: 'tags',
            },
          ]}
          summary={{
            label: 'Total a repartir',
            detail: `Corresponde al ${formatPercent(current.resto)} de la ganancia.`,
            amount: formatMoney(resto),
            base: `Sobre una ganancia de ${formatMoney(base)}.`,
          }}
        />
      ) : null}
    </div>
  )
}

export function EventGainDistribution({
  configId,
  registro,
  ingreso,
}: {
  configId?: number | null
  registro?: EventoGananciaRegistro | null
  ingreso?: number
}) {
  const { items, loading } = useEclesiasticas()
  const current = resolveConfig(items, configId)
  if (loading) return <p className="app-panel__muted">Cargando distribución…</p>
  if (!current || !registro) return null
  return <GainCharts current={current} registro={registro} ingreso={ingreso} />
}

function DistributionChart({
  title,
  subtitle,
  slices,
  summary,
  children,
}: {
  title: string
  subtitle: string
  slices: GainSlice[]
  summary?: { label: string; detail: string; amount: string; base: string }
  children?: ReactNode
}) {
  const visible = slices.filter((slice) => slice.percent > 0)
  return (
    <div className="event-ganancia__chart">
      <p className="event-ganancia__title">{title}</p>
      {children}
      <p className="app-panel__muted">{subtitle}</p>
      <div className="event-ganancia__bar" role="img" aria-label={title}>
        {visible.map((slice) => (
          <span key={slice.key} className={`is-${slice.tone}`} style={{ flexGrow: slice.percent }}>
            {slice.percent >= 12 ? `${formatPercent(slice.percent)}` : ''}
          </span>
        ))}
      </div>
      <ul className="event-ganancia__legend">
        {slices.map((slice) => (
          <li key={slice.key}>
            <span className={`event-ganancia__swatch is-${slice.tone}`}>
              <AdminIcon name={slice.icon} />
            </span>
            <span>
              <strong>
                {slice.label} {formatPercent(slice.percent)}
              </strong>
              <small>{slice.detail}</small>
              {slice.received != null ? (
                <span className="event-ganancia__collect">
                  <i aria-hidden="true">
                    <span
                      style={{
                        width: `${slice.amount > 0 ? Math.min(100, (slice.received / slice.amount) * 100) : 0}%`,
                      }}
                    />
                  </i>
                  <small>
                    Recibido {formatMoney(slice.received)} · Falta {formatMoney(Math.max(0, slice.amount - slice.received))} · Proyectado {formatMoney(slice.amount)}
                  </small>
                </span>
              ) : null}
            </span>
            <em>{formatMoney(slice.received != null ? slice.received : slice.amount)}</em>
          </li>
        ))}
      </ul>
      {summary ? (
        <aside className="event-ganancia__total">
          <span>{summary.label}</span>
          <small>{summary.detail}</small>
          <strong>{summary.amount}</strong>
          <small>{summary.base}</small>
        </aside>
      ) : null}
    </div>
  )
}

export function EventGananciasPanel({
  value,
  onChange,
  cuentaBancariaId,
  onCuentaBancariaChange,
  services,
  cantidades,
  inversiones,
  onInversion,
  capital,
  onCapital,
  loadingServices = false,
  canChange = false,
  registro = null,
}: EventGananciasPanelProps) {
  const notices = useNotice()
  const { items, loading } = useEclesiasticas()
  const [cuentas, setCuentas] = useState<CuentaBancariaClub[]>([])
  const [loadingCuentas, setLoadingCuentas] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingCuentas(true)
    settingsApi
      .cuentasBancarias()
      .then((next) => {
        if (!cancelled) setCuentas(next.filter((item) => item.activo !== false))
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar las cuentas bancarias'))
      })
      .finally(() => {
        if (!cancelled) setLoadingCuentas(false)
      })
    return () => {
      cancelled = true
    }
  }, [notices])

  useEffect(() => {
    if (!canChange || loading || items.length === 0) return
    const selected = items.some((item) => String(item.id) === value)
    if (selected) return
    const next = preferredId(items)
    if (next) onChange(next)
  }, [canChange, items, loading, onChange, value])

  useEffect(() => {
    if (!canChange || loadingCuentas || cuentas.length === 0) return
    if (cuentaBancariaId && cuentas.some((item) => String(item.id) === cuentaBancariaId)) return
    onCuentaBancariaChange(String(cuentas[0].id))
  }, [canChange, loadingCuentas, cuentas, cuentaBancariaId, onCuentaBancariaChange])

  const current = items.find((item) => String(item.id) === value) ?? null
  const dist = current?.distribucion ?? null
  const selectedCuenta = cuentas.find((item) => String(item.id) === cuentaBancariaId) ?? null
  const lines = services.map((service) => {
    const cantidad = wholeAmount(cantidades[service.id] ?? '')
    const inversion = wholeAmount(inversiones[service.id] ?? '')
    return {
      ...service,
      cantidad,
      total: service.totalRegistrado ?? 0,
      gananciaUnidad: service.gananciaUnidad ?? 0,
      inversion,
    }
  })
  const proyeccion = registro?.proyeccion ?? 0
  const capitalAmount = registro?.capital ?? 0
  const ganancia = registro?.ganancia ?? 0

  useEffect(() => {
    if (loadingServices || !registro) return
    const next = capitalAmount > 0 ? String(Math.round(capitalAmount)) : ''
    if (next !== capital) onCapital(next)
  }, [capital, capitalAmount, loadingServices, onCapital, registro])

  return (
    <section className="event-form__section event-ganancia">
      <h3>Distribución de ganancias</h3>
      <p className="app-panel__muted">
        {canChange
          ? 'El evento usa la configuración por defecto del club. Puedes elegir otra para esta actividad.'
          : 'Esta es la configuración activa de la actividad.'}
      </p>
      {loading ? <p className="app-panel__muted">Cargando configuraciones…</p> : null}
      {!loading && items.length === 0 ? (
        <p className="app-panel__hint">
          No hay configuraciones. Créalas en Configuración, en Distribución de ganancias.
        </p>
      ) : null}
      <label className="event-ganancia__config">
        Cuenta bancaria para consignaciones
        <select
          value={cuentaBancariaId}
          disabled={!canChange || loadingCuentas}
          onChange={(event) => onCuentaBancariaChange(event.target.value)}
        >
          <option value="">Sin cuenta</option>
          {cuentas.map((cuenta) => (
            <option key={cuenta.id} value={String(cuenta.id)}>
              {(cuenta.banco || cuenta.nombre) +
                ` · ${cuenta.numero_cuenta}` +
                (cuenta.titular ? ` · ${cuenta.titular}` : '') +
                ` · ${cuenta.tipo_cuenta === 'corriente' ? 'Corriente' : 'Ahorros'}`}
            </option>
          ))}
        </select>
        {selectedCuenta ? (
          <small>
            {selectedCuenta.titular || 'Sin representante'} ·{' '}
            {selectedCuenta.tipo_cuenta === 'corriente' ? 'Corriente' : 'Ahorros'}
          </small>
        ) : (
          <small>
            {canChange
              ? 'Elige la cuenta de consignación. Créalas en Configuración → Cuentas bancarias.'
              : 'Elige a qué cuenta se consignan los abonos de esta actividad económica.'}
          </small>
        )}
        {!loadingCuentas && cuentas.length === 0 ? (
          <small className="app-panel__hint">
            Todavía no hay cuentas. Agrégalas en Configuración, en Cuentas bancarias.
          </small>
        ) : null}
      </label>
      <div className="event-ganancia__kpis">
        <p>
          <small>Proyección de ingresos</small>
          <strong>{formatMoney(proyeccion)}</strong>
        </p>
        <p>
          <small>Total invertido</small>
          <strong>{formatMoney(capitalAmount)}</strong>
        </p>
        <p className="is-total">
          <small>Ganancia estimada</small>
          <strong>{formatMoney(ganancia)}</strong>
        </p>
      </div>
      {current ? (
        <GainCharts current={current} registro={registro}>
          {!loading && items.length > 0 ? (
            <label className="event-ganancia__config">
              Configuración de este evento
              <select value={value} disabled={!canChange} onChange={(event) => onChange(event.target.value)}>
                {items.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nombre}
                    {item.es_predeterminada ? ' · por defecto' : ''}
                  </option>
                ))}
              </select>
              {canChange ? null : <small>Solo el director puede cambiar esta configuración.</small>}
            </label>
          ) : null}
        </GainCharts>
      ) : null}
      <section className="event-ganancia__products">
        <p className="event-ganancia__title">Ganancia por servicio</p>
        <p className="app-panel__muted">
          Cada servicio descuenta su propia inversión. De lo que queda, el{' '}
          {formatPercent(dist?.miembros ?? 0)} es para los participantes y se divide entre las unidades pedidas.
        </p>
        {loadingServices ? <p className="app-panel__muted">Cargando servicios…</p> : null}
        {!loadingServices && lines.length === 0 ? (
          <p className="app-panel__hint">Agrega los servicios en la ficha para calcular la ganancia de cada uno.</p>
        ) : null}
        {lines.map((line) => {
          const porUnidad = line.gananciaUnidad
          return (
            <article key={line.id} className="event-ganancia__product">
              <ServiceThumb item={line} />
              <header>
                <strong>{line.nombre}</strong>
                {line.tipo ? (
                  <span className="event-ganancia__badge">
                    <AdminIcon name="tags" />
                    {line.tipo}
                  </span>
                ) : null}
                {line.descripcion ? <small>{line.descripcion}</small> : null}
              </header>
              <div className="event-ganancia__metrics">
                  <label className="event-ganancia__metric">
                    <AdminIcon name="wallet" />
                    <span>
                      <small>Inversión</small>
                      <input
                        inputMode="numeric"
                        min={0}
                        placeholder="0"
                        aria-label={`Inversión de ${line.nombre}`}
                        value={inversiones[line.id] ?? ''}
                        onChange={(event) => onInversion(line.id, digitsOnly(event.target.value))}
                      />
                    </span>
                  </label>
                  <p className="event-ganancia__metric">
                    <AdminIcon name="coins" />
                    <span>
                      <small>Precio unitario</small>
                      <strong>{formatMoney(line.precio)}</strong>
                    </span>
                  </p>
                  <p className="event-ganancia__metric">
                    <AdminIcon name="calculator" />
                    <span>
                      <small>Ganancia por unidad</small>
                      <strong>{formatMoney(porUnidad)}</strong>
                    </span>
                  </p>
                  <p className="event-ganancia__metric is-event">
                    <AdminIcon name="group" />
                    <span>
                      <small>Total del evento</small>
                      <em>
                        {line.cantidad} {line.cantidad === 1 ? 'unidad' : 'unidades'}
                      </em>
                      <strong>{formatMoney(line.total)}</strong>
                    </span>
                  </p>
                </div>
            </article>
          )
        })}
      </section>
      {ganancia < 0 ? (
        <p className="app-panel__hint">El capital supera la proyección. No queda ganancia para repartir.</p>
      ) : null}
    </section>
  )
}
