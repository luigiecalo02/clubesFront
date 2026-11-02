import { useEffect, useState, type ReactNode } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import type { AdminIconName } from '../../admin/menu'
import { AppTabs } from '../../theme/AppTabs'
import { CreateDrawer } from '../../theme/CreateDrawer'

export type EventsView = 'cuadricula' | 'cronograma' | 'carrusel'

const MOBILE_FILTERS = '(max-width: 900px)'

const VIEW_OPTIONS: { id: EventsView; label: string; icon: AdminIconName }[] = [
  { id: 'cuadricula', label: 'Cuadrícula', icon: 'grid' },
  { id: 'cronograma', label: 'Cronograma', icon: 'calendar' },
  { id: 'carrusel', label: 'Carrusel', icon: 'carousel' },
]

const ALL_VIEW_TABS = VIEW_OPTIONS.map((option) => ({
  id: option.id,
  label: (
    <>
      <AdminIcon name={option.icon} /> {option.label}
    </>
  ),
}))

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
  /** Solo Carrusel, sin controles de vista (miembro en móvil). */
  memberMobileOnly?: boolean
  children?: ReactNode
}

export function EventsViewToggle({
  view,
  filtersOpen,
  onChange,
  onToggleFilters,
  onCloseFilters,
  filters,
  memberMobileOnly = false,
  children,
}: EventsViewToggleProps) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_FILTERS).matches : false,
  )
  const [viewsOpen, setViewsOpen] = useState(false)
  const showFilters = !memberMobileOnly && view !== 'cronograma'
  const closeFilters = onCloseFilters ?? onToggleFilters
  const currentView = VIEW_OPTIONS.find((option) => option.id === view) ?? VIEW_OPTIONS[0]

  useEffect(() => {
    const media = window.matchMedia(MOBILE_FILTERS)
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!isMobile && viewsOpen) setViewsOpen(false)
  }, [isMobile, viewsOpen])

  function pickView(next: EventsView) {
    onChange(next)
    setViewsOpen(false)
    if (next === 'cronograma' && filtersOpen) closeFilters()
  }

  const filtersDrawer = showFilters ? (
    <CreateDrawer
      open={filtersOpen}
      title="Filtros"
      subtitle="Estado, tipo y rango de fechas"
      placement={isMobile ? 'bottom' : 'end'}
      onClose={closeFilters}
      footer={
        <button type="button" className="app-panel__btn--primary" onClick={closeFilters}>
          Ver resultados
        </button>
      }
    >
      {filters}
    </CreateDrawer>
  ) : null

  if (isMobile) {
    return (
      <>
        <div
          className={`app-tabs has-sheet admin-events__views is-compact-mobile${
            memberMobileOnly ? ' is-member-mobile' : ''
          }`}
        >
          {memberMobileOnly ? null : (
            <div className="admin-events__view-compact">
              <button
                type="button"
                className={`app-panel__btn--ghost admin-events__view-eye${viewsOpen ? ' is-on' : ''}`}
                aria-label={`Cambiar vista. Actual: ${currentView.label}`}
                aria-expanded={viewsOpen}
                aria-haspopup="dialog"
                onClick={() => setViewsOpen(true)}
              >
                <AdminIcon name="eye" />
              </button>
              {showFilters ? (
                <button
                  type="button"
                  className={`app-panel__btn--ghost admin-events__view-eye${filtersOpen ? ' is-on' : ''}`}
                  aria-label="Filtros"
                  aria-pressed={filtersOpen}
                  aria-expanded={filtersOpen}
                  onClick={onToggleFilters}
                >
                  <AdminIcon name="filter" />
                </button>
              ) : null}
            </div>
          )}
          <div className="app-tabs__body">{children}</div>
        </div>

        {memberMobileOnly ? null : (
          <CreateDrawer
            open={viewsOpen}
            title="Vista"
            subtitle="Elige cómo ver los eventos"
            placement="bottom"
            onClose={() => setViewsOpen(false)}
          >
            <div className="admin-events__view-picker" role="listbox" aria-label="Vista de eventos">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={option.id === view}
                  className={`app-panel__btn--ghost admin-events__view-option${
                    option.id === view ? ' is-on' : ''
                  }`}
                  onClick={() => pickView(option.id)}
                >
                  <AdminIcon name={option.icon} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </CreateDrawer>
        )}

        {filtersDrawer}
      </>
    )
  }

  return (
    <>
      <AppTabs
        className="admin-events__views"
        label="Vista de eventos"
        value={view}
        onChange={onChange}
        extra={
          showFilters ? (
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
          ) : null
        }
        tabs={ALL_VIEW_TABS}
      >
        {children}
      </AppTabs>
      {filtersDrawer}
    </>
  )
}
