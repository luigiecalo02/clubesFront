import { Link } from 'react-router-dom'
import type { ClubServicio } from '../../api/types'
import { ServiceThumb } from '../services/ServiceVisual'

function formatPrice(value: number | string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

type EventServicesFieldProps = {
  catalog: ClubServicio[]
  selectedIds: number[]
  loading?: boolean
  onChange: (ids: number[]) => void
}

export function EventServicesField({
  catalog,
  selectedIds,
  loading = false,
  onChange,
}: EventServicesFieldProps) {
  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id])
  }

  return (
    <fieldset className="admin-service-picks">
      <legend>Servicios del club</legend>
      {loading ? <p className="app-panel__muted">Cargando servicios…</p> : null}
      {!loading && catalog.length === 0 ? (
        <p className="app-panel__hint">
          Este club todavía no tiene servicios.{' '}
          <Link className="app-panel__link--accent" to="/servicios">
            Crear en Servicios
          </Link>
        </p>
      ) : null}
      {!loading
        ? catalog.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggle(item.id)}
              />
              <ServiceThumb item={item} />
              <span>
                {item.nombre}
                <small>
                  {formatPrice(item.precio)}
                  {item.descripcion ? ` · ${item.descripcion}` : ''}
                </small>
              </span>
            </label>
          ))
        : null}
    </fieldset>
  )
}
