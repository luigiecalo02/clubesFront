export type EventWorkspaceTab = 'ficha' | 'subeventos'

type EventTabsProps = {
  tab: EventWorkspaceTab
  count?: number
  onChange: (tab: EventWorkspaceTab) => void
}

export function EventTabs({ tab, count = 0, onChange }: EventTabsProps) {
  return (
    <div className="admin-event-tabs" role="tablist" aria-label="Secciones del evento">
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'ficha'}
        className={`admin-events__view${tab === 'ficha' ? ' is-on' : ''}`}
        onClick={() => onChange('ficha')}
      >
        Ficha
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'subeventos'}
        className={`admin-events__view${tab === 'subeventos' ? ' is-on' : ''}`}
        onClick={() => onChange('subeventos')}
      >
        Subeventos{count ? ` (${count})` : ''}
      </button>
    </div>
  )
}
