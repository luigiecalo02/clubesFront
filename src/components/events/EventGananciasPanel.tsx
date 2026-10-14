import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { settingsApi } from '../../api/settings'
import type { GananciaEclesiastica } from '../../api/types'
import { useNotice } from '../../theme/NoticeProvider'

export type GananciaServicioLine = {
  id: number
  nombre: string
  precio: number
}

type EventGananciasPanelProps = {
  value: string
  onChange: (id: string) => void
  services: GananciaServicioLine[]
  cantidades: Record<number, string>
  capital: string
  onCapital: (value: string) => void
  loadingServices?: boolean
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

function share(total: number, percent: number): number {
  return Math.round((total * percent) / 100)
}

function preferredId(items: GananciaEclesiastica[]): string {
  const preferred = items.find((item) => item.es_predeterminada) ?? items[0]
  return preferred ? String(preferred.id) : ''
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function EventGananciasPanel({
  value,
  onChange,
  services,
  cantidades,
  capital,
  onCapital,
  loadingServices = false,
}: EventGananciasPanelProps) {
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

  useEffect(() => {
    if (loading || items.length === 0) return
    const selected = items.some((item) => String(item.id) === value)
    if (selected) return
    const next = preferredId(items)
    if (next) onChange(next)
  }, [items, loading, onChange, value])

  const current = items.find((item) => String(item.id) === value) ?? null
  const dist = current?.distribucion ?? null
  const lines = services.map((service) => {
    const cantidad = wholeAmount(cantidades[service.id] ?? '')
    return { ...service, cantidad, total: cantidad * service.precio }
  })
  const proyeccion = lines.reduce((sum, line) => sum + line.total, 0)
  const capitalAmount = wholeAmount(capital)
  const ganancia = proyeccion - capitalAmount
  const diezmo = current ? share(Math.max(0, ganancia), current.diezmo) : 0
  const ofrenda = current ? share(Math.max(0, ganancia), current.ofrenda) : 0
  const resto = Math.max(0, ganancia) - diezmo - ofrenda

  return (
    <section className="event-form__section event-ganancia">
      <h3>Distribución de ganancias</h3>
      <p className="app-panel__muted">
        El evento usa la configuración por defecto del club. Puedes elegir otra para esta actividad.
      </p>
      {loading ? <p className="app-panel__muted">Cargando configuraciones…</p> : null}
      {!loading && items.length === 0 ? (
        <p className="app-panel__hint">
          No hay configuraciones. Créalas en Configuración, en Distribución de ganancias.
        </p>
      ) : null}
      {!loading && items.length > 0 ? (
        <label>
          Configuración de este evento
          <select value={value} onChange={(event) => onChange(event.target.value)}>
            {items.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.nombre}
                {item.es_predeterminada ? ' · por defecto' : ''}
              </option>
            ))}
          </select>
          {current ? (
            <small>
              Diezmo {formatPercent(current.diezmo)} · Ofrenda {formatPercent(current.ofrenda)} · Resto{' '}
              {formatPercent(current.resto)}
              {dist
                ? ` · ${dist.nombre} (club ${formatPercent(dist.club)}, miembros ${formatPercent(dist.miembros)}, extras ${formatPercent(dist.extras)})`
                : ''}
            </small>
          ) : null}
        </label>
      ) : null}

      <p className="event-ganancia__title">Capital y proyección</p>
      <p className="app-panel__muted">
        La cantidad es la suma de lo que pidieron los integrantes. La proyección es esa suma por el precio, y la
        ganancia es la proyección menos el capital.
      </p>
      {loadingServices ? <p className="app-panel__muted">Cargando servicios…</p> : null}
      {!loadingServices && services.length === 0 ? (
        <p className="app-panel__hint">Agrega los servicios en la ficha para proyectar la recolecta.</p>
      ) : null}
      {lines.map((line) => (
        <div key={line.id} className="event-ganancia__pedido">
          <span>{line.nombre}</span>
          <strong>{line.cantidad}</strong>
          <small>
            {formatMoney(line.precio)} c/u
            {line.cantidad > 0
              ? ` · ${line.cantidad} × ${formatMoney(line.precio)} = ${formatMoney(line.total)}`
              : ' · sin pedidos de integrantes'}
          </small>
        </div>
      ))}
      <label>
        Capital gastado
        <input
          inputMode="numeric"
          min={0}
          placeholder="0"
          value={capital}
          onChange={(event) => onCapital(digitsOnly(event.target.value))}
        />
        <small>Lo que costó producir o comprar lo que se va a vender.</small>
      </label>

      <ul className="event-ganancia__split">
        <li>
          <span>Proyección</span>
          <strong>{formatMoney(proyeccion)}</strong>
        </li>
        <li>
          <span>Capital</span>
          <strong>{formatMoney(capitalAmount)}</strong>
        </li>
        <li className="is-total">
          <span>Ganancia a distribuir</span>
          <strong>{formatMoney(ganancia)}</strong>
        </li>
        {current && ganancia > 0 ? (
          <>
            <li>
              <span>Diezmo {formatPercent(current.diezmo)}</span>
              <strong>{formatMoney(diezmo)}</strong>
            </li>
            <li>
              <span>Ofrenda {formatPercent(current.ofrenda)}</span>
              <strong>{formatMoney(ofrenda)}</strong>
            </li>
            <li>
              <span>Resto {formatPercent(current.resto)}</span>
              <strong>{formatMoney(resto)}</strong>
            </li>
            {dist ? (
              <>
                <li>
                  <span>
                    Club {formatPercent(dist.club)} de {dist.nombre}
                  </span>
                  <strong>{formatMoney(share(resto, dist.club))}</strong>
                </li>
                <li>
                  <span>Miembros {formatPercent(dist.miembros)}</span>
                  <strong>{formatMoney(share(resto, dist.miembros))}</strong>
                </li>
                <li>
                  <span>Extras {formatPercent(dist.extras)}</span>
                  <strong>{formatMoney(share(resto, dist.extras))}</strong>
                </li>
              </>
            ) : null}
          </>
        ) : null}
      </ul>
      {ganancia < 0 ? (
        <p className="app-panel__hint">El capital supera la proyección. No queda ganancia para repartir.</p>
      ) : null}
    </section>
  )
}
