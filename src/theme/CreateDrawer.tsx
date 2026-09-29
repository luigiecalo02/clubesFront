import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AppPanel } from './AppPanel'
import './create-drawer.css'

type CreateDrawerProps = {
  open: boolean
  title: string
  subtitle?: string | null
  cover?: string | null
  avatar?: string | null
  avatarFallback?: string | null
  placement?: 'end' | 'top' | 'bottom'
  size?: 'default' | 'half'
  stacked?: boolean
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

export function CreateDrawer({
  open,
  title,
  subtitle,
  cover,
  avatar,
  avatarFallback,
  placement = 'end',
  size = 'default',
  stacked = false,
  onClose,
  footer,
  children,
}: CreateDrawerProps) {
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (stacked) event.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, stacked)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey, stacked)
    }
  }, [onClose, open, stacked])

  if (!open) return null

  const host = document.querySelector('.admin-shell') ?? document.body

  return createPortal(
    <div
      className={`create-drawer${placement === 'top' ? ' create-drawer--top' : ''}${placement === 'bottom' ? ' create-drawer--bottom' : ''}${size === 'half' ? ' create-drawer--half' : ''}${stacked ? ' create-drawer--stacked' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="create-drawer__backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <AppPanel className="create-drawer__panel" shine={false}>
        <header className={`create-drawer__head${cover ? ' create-drawer__head--cover' : ''}`}>
          {cover ? <img src={cover} alt="" className="create-drawer__cover" /> : null}
          {cover ? <span className="create-drawer__cover-fade" aria-hidden="true" /> : null}
          {avatar || avatarFallback ? (
            <span className="create-drawer__avatar" aria-hidden="true">
              {avatar ? <img src={avatar} alt="" /> : avatarFallback}
            </span>
          ) : null}
          <div className="create-drawer__heading">
            {subtitle ? <p className="app-panel__kicker">{subtitle}</p> : null}
            <h2 className="create-drawer__title">{title}</h2>
          </div>
          <button type="button" className="create-drawer__close" aria-label="Cerrar" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="create-drawer__body">{children}</div>
        {footer ? <footer className="create-drawer__footer">{footer}</footer> : null}
      </AppPanel>
    </div>,
    host,
  )
}
