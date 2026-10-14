import type { ReactNode } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import { AppTabs } from '../../theme/AppTabs'

export type EventsView = 'cuadricula' | 'cronograma'

type EventsViewToggleProps = {
  view: EventsView
  filtersOpen: boolean
  onChange: (view: EventsView) => void
  onToggleFilters: () => void
  filters?: ReactNode
  children?: ReactNode
}

export function EventsViewToggle({
  view,
  filtersOpen,
  onChange,
  onToggleFilters,
  filters,
  children,
}: EventsViewToggleProps) {
  return (
    <AppTabs
      className="admin-events__views"
      label="Vista de eventos"
      value={view}
      onChange={onChange}
      extra={view === 'cuadricula' ? (
        <>
          <button
            type="button"
            aria-pressed={filtersOpen}
            aria-expanded={filtersOpen}
            className={`app-panel__btn--ghost${filtersOpen ? ' is-on' : ''}`}
            onClick={onToggleFilters}
          >
            <AdminIcon name="filter" />
            Filtros
          </button>
          {filtersOpen ? filters : null}
        </>
      ) : null}
      tabs={[
        { id: 'cuadricula', label: <><AdminIcon name="grid" /> Cuadrícula</> },
        { id: 'cronograma', label: <><AdminIcon name="calendar" /> Cronograma</> },
      ]}
    >
      {children}
    </AppTabs>
  )
}
