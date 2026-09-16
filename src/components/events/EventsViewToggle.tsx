import { AdminIcon } from '../../admin/AdminIcon'
import { AppPanel } from '../../theme/AppPanel'

export type EventsView = 'cuadricula' | 'cronograma'

type EventsViewToggleProps = {
  view: EventsView
  onChange: (view: EventsView) => void
}

export function EventsViewToggle({ view, onChange }: EventsViewToggleProps) {
  return (
    <AppPanel
      as="div"
      className="admin-events__views"
      shine={false}
      role="tablist"
      aria-label="Vista de eventos"
    >
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
    </AppPanel>
  )
}
