import type { ReactNode } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import { AppPanel } from '../../theme/AppPanel'

export type EventsView = 'cuadricula' | 'cronograma'

type EventsViewToggleProps = {
  view: EventsView
  filtersOpen: boolean
  onChange: (view: EventsView) => void
  onToggleFilters: () => void
  children?: ReactNode
}

export function EventsViewToggle({
  view,
  filtersOpen,
  onChange,
  onToggleFilters,
  children,
}: EventsViewToggleProps) {
  return (
    <AppPanel as="div" className="admin-events__views" shine={false}>
      <div className="admin-events__view-tabs" role="tablist" aria-label="Vista de eventos">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'cuadricula'}
          className={`admin-events__view${view === 'cuadricula' ? ' is-on' : ''}`}
          onClick={() => onChange('cuadricula')}
        >
          <AdminIcon name="grid" />
          Cuadrícula
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'cronograma'}
          className={`admin-events__view${view === 'cronograma' ? ' is-on' : ''}`}
          onClick={() => onChange('cronograma')}
        >
          <AdminIcon name="calendar" />
          Cronograma
        </button>
        <button
          type="button"
          aria-pressed={filtersOpen}
          aria-expanded={filtersOpen}
          className={`admin-events__view${filtersOpen ? ' is-on' : ''}`}
          onClick={onToggleFilters}
        >
          <AdminIcon name="filter" />
          Filtros
        </button>
      </div>
      {children}
    </AppPanel>
  )
}
