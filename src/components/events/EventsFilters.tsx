import type { EventTipo } from '../../api/types'
import { DateInput } from '../../theme/DateInput'

export const EVENT_ESTADO_FILTERS = [
  { value: '', label: 'Activos y próximos' },
  { value: 'todos', label: 'Todos' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'cerrado', label: 'Finalizado' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

type EventsFiltersProps = {
  estado: string
  tipo: string
  tipos: EventTipo[]
  desde: string
  hasta: string
  onEstado: (value: string) => void
  onTipo: (value: string) => void
  onDesde: (value: string) => void
  onHasta: (value: string) => void
}

export function EventsFilters({
  estado,
  tipo,
  tipos,
  desde,
  hasta,
  onEstado,
  onTipo,
  onDesde,
  onHasta,
}: EventsFiltersProps) {
  return (
    <div className="admin-events__filters">
      <label>
        Estado
        <select value={estado} onChange={(event) => onEstado(event.target.value)}>
          {EVENT_ESTADO_FILTERS.map((option) => (
            <option key={option.value || 'vigentes'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tipo
        <select value={tipo} onChange={(event) => onTipo(event.target.value)}>
          <option value="">Todos los tipos</option>
          {tipos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Desde
        <DateInput value={desde} onChange={onDesde} />
      </label>
      <label>
        Hasta
        <DateInput min={desde || undefined} value={hasta} onChange={onHasta} />
      </label>
    </div>
  )
}
