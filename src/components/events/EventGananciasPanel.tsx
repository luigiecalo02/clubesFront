import { useEffect, useState, type ReactNode } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import type { AdminIconName } from '../../admin/menu'
import { getApiErrorMessage } from '../../api/client'
import { settingsApi } from '../../api/settings'
import type { EventoGananciaRegistro, GananciaEclesiastica } from '../../api/types'
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

function useEclesiasticas() {
  const notices = useNotice()
  const [items, setItems] = useState<GananciaEclesiastica[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    settingsApi
      .eclesiasticas()
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch((err) => {
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

function collectedShare(amount: number, ratio?: number): number | undefined {
  if (ratio == null) return undefined
  const portion = Math.max(0, ratio)
  return Math.round(amount * portion)
}

function GainCharts({
  current,
  registro,
  cobrado,
  children,
}: {
  current: GananciaEclesiastica
  registro?: EventoGananciaRegistro | null
  cobrado?: number
  children?: ReactNode
}) {
  const dist = current.distribucion ?? null
  const base = registro?.ganancia ?? 0
  const diezmo = registro?.diezmo ?? 0
  const ofrenda = registro?.ofrenda ?? 0
  const resto = registro?.resto ?? 0
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
            received: collectedShare(ofrenda, cobrado),
            tone: 'ofrenda',
            icon: 'star',
          },
          {
            key: 'diezmo',
            label: 'Diezmo',
            detail: 'de la ganancia',
            percent: current.diezmo,
            amount: diezmo,
            received: collectedShare(diezmo, cobrado),
            tone: 'diezmo',
            icon: 'coins',
          },
          {
            key: 'resto',
            label: 'Ganancia a repartir',
            detail: 'lo que queda después de diezmo y ofrenda',
            percent: current.resto,
            amount: resto,
            received: collectedShare(resto, cobrado),
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
              received: collectedShare(registro?.participantes ?? 0, cobrado),
              tone: 'miembros',
              icon: 'group',
            },
            {
              key: 'club',
              label: 'Club',
              detail: 'de la ganancia a repartir',
              percent: dist.club,
                  amount: registro?.club ?? 0,
              received: collectedShare(registro?.club ?? 0, cobrado),
              tone: 'club',
              icon: 'building',
            },
            {
              key: 'extras',
              label: 'Otros',
              detail: 'de la ganancia a repartir',
              percent: dist.extras,
                  amount: registro?.extras ?? 0,
              received: collectedShare(registro?.extras ?? 0, cobrado),
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
  cobrado,
}: {
  configId?: number | null
  registro?: EventoGananciaRegistro | null
  cobrado?: number
}) {
  const { items, loading } = useEclesiasticas()
  const current = resolveConfig(items, configId)
  if (loading) return <p className="app-panel__muted">Cargando distribución…</p>
  if (!current || !registro) return null
  return <GainCharts current={current} registro={registro} cobrado={cobrado} />
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
                    Recibido {formatMoney(slice.received)} · Proyectado {formatMoney(slice.amount)}
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
  const { items, loading } = useEclesiasticas()

  useEffect(() => {
    if (!canChange || loading || items.length === 0) return
    const selected = items.some((item) => String(item.id) === value)
    if (selected) return
    const next = preferredId(items)
    if (next) onChange(next)
  }, [canChange, items, loading, onChange, value])

  const current = items.find((item) => String(item.id) === value) ?? null
  const dist = current?.distribucion ?? null
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
