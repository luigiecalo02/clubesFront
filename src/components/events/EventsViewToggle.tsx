import { useEffect, useState, type ReactNode } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import { AppTabs } from '../../theme/AppTabs'
import { CreateDrawer } from '../../theme/CreateDrawer'

export type EventsView = 'cuadricula' | 'cronograma' | 'carrusel'

const MOBILE_FILTERS = '(max-width: 900px)'

export function parseEventsView(value: string | null): EventsView {
  if (value === 'cronograma' || value === 'carrusel') return value
  return 'cuadricula'
}

type EventsViewToggleProps = {
  view: EventsView
  filtersOpen: boolean
  onChange: (view: EventsView) => void
  onToggleFilters: () => void
  onCloseFilters?: () => void
  filters?: ReactNode
  children?: ReactNode
}

export function EventsViewToggle({
  view,
  filtersOpen,
  onChange,
  onToggleFilters,
  onCloseFilters,
  filters,
  children,
}: EventsViewToggleProps) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_FILTERS).matches : false,
  )
  const showFilters = view !== 'cronograma'
  const closeFilters = onCloseFilters ?? onToggleFilters

  useEffect(() => {
    const media = window.matchMedia(MOBILE_FILTERS)
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return (
    <>
      <AppTabs
        className="admin-events__views"
        label="Vista de eventos"
        value={view}
        onChange={onChange}
        extra={
          showFilters ? (
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
              {filtersOpen && !isMobile ? filters : null}
            </>
          ) : null
        }
        tabs={[
          { id: 'cuadricula', label: <><AdminIcon name="grid" /> Cuadrícula</> },
          { id: 'cronograma', label: <><AdminIcon name="calendar" /> Cronograma</> },
          { id: 'carrusel', label: <><AdminIcon name="carousel" /> Carrusel</> },
        ]}
      >
        {children}
      </AppTabs>
      {showFilters ? (
        <CreateDrawer
          open={filtersOpen && isMobile}
          title="Filtros"
          subtitle="Estado, tipo y rango de fechas"
          placement="bottom"
          onClose={closeFilters}
          footer={
            <button type="button" className="app-panel__btn--primary" onClick={closeFilters}>
              Ver resultados
            </button>
          }
        >
          {filters}
        </CreateDrawer>
      ) : null}
    </>
  )
}
