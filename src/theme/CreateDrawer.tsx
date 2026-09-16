import { useEffect, type ReactNode } from 'react'
import { AppPanel } from './AppPanel'
import './create-drawer.css'

type CreateDrawerProps = {
  open: boolean
  title: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

export function CreateDrawer({
  open,
  title,
  onClose,
  footer,
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
      <AppPanel className="create-drawer__panel" shine={false}>
        <header className="create-drawer__head">
          <h2 className="create-drawer__title">{title}</h2>
          <button type="button" className="create-drawer__close" aria-label="Cerrar" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="create-drawer__body">{children}</div>
        {footer ? <footer className="create-drawer__footer">{footer}</footer> : null}
      </AppPanel>
    </div>
  )
}
