import { useEffect, type ReactNode } from 'react'
import { AppPanel } from './AppPanel'
import './create-drawer.css'

type CreateDrawerProps = {
  open: boolean
  title: string
  kicker?: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

export function CreateDrawer({
  open,
  title,
  kicker = 'Nuevo',
  subtitle,
  onClose,
  children,
}: CreateDrawerProps) {
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="create-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="create-drawer__backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <AppPanel className="create-drawer__panel">
        <button type="button" className="create-drawer__close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <header className="create-drawer__head">
          <p className="app-panel__kicker">{kicker}</p>
          <h2 className="app-panel__title">{title}</h2>
          {subtitle ? <p className="app-panel__subtitle">{subtitle}</p> : null}
        </header>
        <div className="create-drawer__body">{children}</div>
      </AppPanel>
    </div>
  )
}
