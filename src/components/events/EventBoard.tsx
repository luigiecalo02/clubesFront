import { useState } from 'react'
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

  const body = (
    <>
      <EventTabs tab={tab} count={count} onChange={setTab} />
      {tab === 'ficha' ? (
        <EventCard
          item={item}
          now={now}
          framed={false}
          showHeading={showHeading}
          showActions={showActions}
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
