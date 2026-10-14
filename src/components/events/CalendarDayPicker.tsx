import { useEffect, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { resolveFileUrl } from '../../api/baseUrl'
import type { EventSummary } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'
import { lockBodyScroll, unlockBodyScroll } from '../../theme/bodyScrollLock'

type CalendarDayPickerProps = {
  title: string
  items: EventSummary[]
  onSelect: (item: EventSummary) => void
  onClose: () => void
}

export function CalendarDayPicker({ title, items, onSelect, onClose }: CalendarDayPickerProps) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    lockBodyScroll()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      unlockBodyScroll()
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const host = document.querySelector('.admin-main') ?? document.body

  return createPortal(
    <div className="admin-calendar-pick" role="dialog" aria-modal="true" aria-labelledby="calendar-pick-title">
      <button type="button" className="admin-calendar-pick__backdrop" aria-label="Cerrar" onClick={onClose} />
      <AppPanel className="admin-calendar-pick__panel" shine={false}>
        <p className="app-panel__kicker">Elige una actividad</p>
        <h2 id="calendar-pick-title" className="app-panel__title">{title}</h2>
        <div className="admin-calendar-pick__list">
          {items.map((item) => {
            const banner = resolveFileUrl(item.banner_url)
            const logo = resolveFileUrl(item.image_url)
            const color = item.tipo_evento?.color
            return (
              <button
                key={item.id}
                type="button"
                className="admin-calendar-pick__card"
                style={color ? ({ '--chip': color } as CSSProperties) : undefined}
                onClick={() => onSelect(item)}
              >
                {banner || logo ? (
                  <span className={`admin-calendar-pick__media${banner ? ' has-banner' : ''}`}>
                    {banner ? <img src={banner} alt="" className="admin-calendar-pick__banner" /> : null}
                    {logo ? <img src={logo} alt="" className="admin-calendar-pick__logo" /> : null}
                  </span>
                ) : null}
                <span className="admin-calendar-pick__body">
                  <span className="admin-calendar-pick__copy">
                    <strong>{item.name}</strong>
                    {item.tipo_evento?.nombre ? <small>{item.tipo_evento.nombre}</small> : null}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <button type="button" className="app-panel__btn--ghost" onClick={onClose}>
          Cerrar
        </button>
      </AppPanel>
    </div>,
    host,
  )
}
