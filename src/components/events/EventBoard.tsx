import { useState } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
import type { EventSummary, EventTipo } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'
import { EventCard } from './EventCard'
import { EventSubeventsPanel } from './EventSubeventsPanel'
import { EventTabs, type EventWorkspaceTab } from './EventTabs'

type EventBoardProps = {
  item: EventSummary
  now: number
  canTakeAttendance: boolean
  canEdit: boolean
  canManageSubevents: boolean
  tipos: EventTipo[]
  framed?: boolean
  showHeading?: boolean
  showActions?: boolean
  onAttendance: (item: EventSummary) => void
  onEdit: (item: EventSummary) => void
}

export function EventBoard({
  item,
  now,
  canTakeAttendance,
  canEdit,
  canManageSubevents,
  tipos,
  framed = true,
  showHeading = true,
  showActions = true,
  onAttendance,
  onEdit,
}: EventBoardProps) {
  const [tab, setTab] = useState<EventWorkspaceTab>('ficha')
  const [count, setCount] = useState(item.hijos_count ?? 0)
  const banner = resolveFileUrl(item.banner_url)
  const logo = resolveFileUrl(item.image_url)
  const headClass = [
    'admin-event-card__head-bar',
    banner ? 'has-banner' : '',
    logo ? 'has-logo' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const body = (
    <>
      <div className="admin-event-card__head">
        {banner || logo ? (
          <div className={`admin-event-card__media${banner ? ' has-banner' : ''}${logo ? ' has-logo' : ''}`}>
            {banner ? <img src={banner} alt="" className="admin-event-card__banner" /> : null}
            {logo ? <img src={logo} alt="" className="admin-event-card__logo" /> : null}
          </div>
        ) : null}
        <div className={headClass}>
          <EventTabs tab={tab} count={count} onChange={setTab} />
        </div>
      </div>
      {tab === 'ficha' ? (
        <EventCard
          item={item}
          now={now}
          framed={false}
          showHeading={showHeading}
          showActions={showActions}
          showMedia={false}
          canTakeAttendance={canTakeAttendance}
          canEdit={canEdit}
          onAttendance={onAttendance}
          onEdit={onEdit}
        />
      ) : (
        <EventSubeventsPanel
          parent={item}
          tipos={tipos}
          canCreate={canManageSubevents}
          onCount={setCount}
        />
      )}
    </>
  )

  if (!framed) {
    return <div className="admin-event-card admin-event-card--plain">{body}</div>
  }

  return (
    <AppPanel className="admin-event-card" shine={false}>
      {body}
    </AppPanel>
  )
}
