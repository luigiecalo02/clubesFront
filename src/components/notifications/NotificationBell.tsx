import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AdminIcon } from '../../admin/AdminIcon'
import { getApiErrorMessage } from '../../api/client'
import { notificationsApi, type ClubNotificationItem } from '../../api/notifications'
import { AppPanel } from '../../theme/AppPanel'
import { useNotice } from '../../theme/NoticeProvider'
import { useSceneTheme } from '../../theme/sceneTheme'
import './notification-bell.css'

type PanelAnchor = {
  top: number
  right: number
  width: number
  maxHeight: number
}

function readAnchor(trigger: HTMLElement | null): PanelAnchor | null {
  if (!trigger) return null
  const rect = trigger.getBoundingClientRect()
  const gutter = 12
  const width = Math.min(22 * 16, window.innerWidth - gutter * 2)
  const idealRight = Math.max(gutter, window.innerWidth - rect.right)
  // Evita que el panel se salga por la izquierda en pantallas angostas.
  const maxRight = Math.max(gutter, window.innerWidth - width - gutter)
  const top = rect.bottom + 8
  return {
    top,
    right: Math.min(idealRight, maxRight),
    width,
    maxHeight: Math.max(160, window.innerHeight - top - gutter),
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ClubNotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [anchor, setAnchor] = useState<PanelAnchor | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const notices = useNotice()
  const navigate = useNavigate()
  const { theme } = useSceneTheme()
  const hasNotifications = unread > 0 || items.length > 0

  async function refresh(opts?: { showLoading?: boolean }) {
    const showLoading = opts?.showLoading === true
    try {
      if (showLoading) setLoading(true)
      const next = await notificationsApi.list()
      setItems(next.items)
      setUnread(next.unread_count)
      if (next.items.length === 0 && next.unread_count === 0) setOpen(false)
    } catch {
      // Silencioso en la barra: no molestar si falla el poll.
    } finally {
      if (showLoading) setLoading(false)
      setReady(true)
    }
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 60_000)
    function onMessage(event: MessageEvent) {
      if (event.data?.type === 'clubes:notification') void refresh()
    }
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () => {
      window.clearInterval(timer)
      navigator.serviceWorker?.removeEventListener('message', onMessage)
    }
  }, [])

  useLayoutEffect(() => {
    if (!open) return undefined
    function place() {
      setAnchor(readAnchor(triggerRef.current))
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function onPointer(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if ((target as Element).closest?.('.notification-bell__panel')) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function onOpenItem(item: ClubNotificationItem) {
    try {
      if (!item.read_at) {
        const next = await notificationsApi.markRead(item.id)
        setUnread(next.unread_count)
        setItems((current) =>
          current.map((row) => (row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row)),
        )
      }
      setOpen(false)
      navigate(item.url || '/eventos')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo abrir la notificación'))
    }
  }

  async function onMarkAll() {
    try {
      await notificationsApi.markAllRead()
      setUnread(0)
      setItems((current) => current.map((row) => ({ ...row, read_at: row.read_at || new Date().toISOString() })))
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudieron marcar como leídas'))
    }
  }

  const panel =
    open && anchor
      ? createPortal(
          <AppPanel
            className={`notification-bell__panel${theme === 'day' ? ' is-day' : ''}`}
            style={{
              top: anchor.top,
              right: anchor.right,
              width: anchor.width,
              maxWidth: anchor.width,
              maxHeight: anchor.maxHeight,
            }}
            role="dialog"
            aria-label="Historial de notificaciones"
          >
            <header className="notification-bell__head">
              <strong>Notificaciones</strong>
              {unread > 0 ? (
                <button type="button" className="notification-bell__mark-all" onClick={() => void onMarkAll()}>
                  Marcar todas
                </button>
              ) : null}
            </header>
            {loading ? <p className="app-panel__muted notification-bell__empty">Cargando…</p> : null}
            <ul className="notification-bell__list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`notification-bell__item${item.read_at ? '' : ' is-unread'}`}
                    onClick={() => void onOpenItem(item)}
                  >
                    <strong>{item.title || 'Aviso'}</strong>
                    <span>{item.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          </AppPanel>,
          document.body,
        )
      : null

  if (!ready || !hasNotifications) return null

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`notification-bell__btn${open ? ' is-on' : ''}`}
        aria-label="Notificaciones"
        aria-expanded={open}
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) {
            setAnchor(readAnchor(triggerRef.current))
            void refresh({ showLoading: true })
          }
        }}
      >
        <AdminIcon name="bell" />
        {unread > 0 ? <em className="notification-bell__badge">{unread > 99 ? '99+' : unread}</em> : null}
      </button>
      {panel}
    </div>
  )
}
