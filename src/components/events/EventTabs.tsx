import { AppTabList } from '../../theme/AppTabs'

export type EventWorkspaceTab = 'ficha' | 'subeventos' | 'ganancias'

type EventTabsProps = {
  tab: EventWorkspaceTab
  count?: number
  showSubeventos?: boolean
  showGanancias?: boolean
  onChange: (tab: EventWorkspaceTab) => void
}

export function EventTabs({
  tab,
  count = 0,
  showSubeventos = true,
  showGanancias = false,
  onChange,
}: EventTabsProps) {
  const tabs: { id: EventWorkspaceTab; label: string }[] = [{ id: 'ficha', label: 'Ficha' }]
  if (showSubeventos) tabs.push({ id: 'subeventos', label: `Subeventos${count ? ` (${count})` : ''}` })
  if (showGanancias) tabs.push({ id: 'ganancias', label: 'Ganancias' })
  if (tabs.length < 2) return null

  return <AppTabList label="Secciones del evento" tabs={tabs} value={tab} onChange={onChange} />
}
