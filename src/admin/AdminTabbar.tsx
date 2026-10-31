import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { reduceMotion } from '../theme/useTweenNumber'
import { AdminIcon } from './AdminIcon'
import { MY_ABONOS, SESSION_HOME, type AdminIconName } from './menu'

const TABS: { path: string; label: string; icon: AdminIconName }[] = [
  { path: '/', label: 'Inicio', icon: 'home' },
  { path: '/eventos', label: 'Eventos', icon: 'calendar' },
  { path: MY_ABONOS, label: 'Mis abonos', icon: 'wallet' },
  { path: SESSION_HOME, label: 'Mi actividad', icon: 'pulse' },
]

type Thumb = { x: number; y: number; w: number; h: number }

const EMPTY_THUMB: Thumb = { x: 0, y: 0, w: 0, h: 0 }

function tabIsActive(pathname: string, path: string): boolean {
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function AdminTabbar({ showAbonos }: { showAbonos: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const navRef = useRef<HTMLElement>(null)
  const dragRef = useRef({ pointer: -1, startX: 0, dx: 0, swiping: false })
  const [thumb, setThumb] = useState<Thumb>(EMPTY_THUMB)
  const [dx, setDx] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const items = TABS.filter((item) => item.path !== MY_ABONOS || showAbonos)
  const activeIndex = items.findIndex((item) => tabIsActive(location.pathname, item.path))

  function measure() {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('.admin-tabbar__link.is-active')
    if (!nav || !active) {
      setThumb(EMPTY_THUMB)
      return
    }
    const parent = nav.getBoundingClientRect()
    const box = active.getBoundingClientRect()
    setThumb({
      x: box.left - parent.left,
      y: box.top - parent.top,
      w: box.width,
      h: box.height,
    })
  }

  useLayoutEffect(() => {
    measure()
  }, [location.pathname, items.length])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return undefined
    const observer = new ResizeObserver(() => measure())
    observer.observe(nav)
    window.addEventListener('orientationchange', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('orientationchange', measure)
    }
  }, [items.length])

  function goTo(index: number) {
    const next = items[index]
    if (!next || index === activeIndex) return
    navigate(next.path)
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    dragRef.current = { pointer: event.pointerId, startX: event.clientX, dx: 0, swiping: false }
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (drag.pointer !== event.pointerId) return
    const nextDx = event.clientX - drag.startX
    if (!drag.swiping && Math.abs(nextDx) < 12) return
    if (!drag.swiping) {
      drag.swiping = true
      setSwiping(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    drag.dx = nextDx
    setDx(nextDx)
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (drag.pointer !== event.pointerId) return
    const nav = navRef.current
    const step = nav ? nav.clientWidth / Math.max(items.length, 1) : 80
    const shouldSwipe = drag.swiping && Math.abs(drag.dx) > step * 0.28
    if (shouldSwipe && activeIndex >= 0) {
      goTo(activeIndex + (drag.dx < 0 ? 1 : -1))
    }
    dragRef.current = { pointer: -1, startX: 0, dx: 0, swiping: false }
    setDx(0)
    setSwiping(false)
  }

  const thumbX = thumb.w > 0 ? thumb.x + dx : 0

  return (
    <nav
      ref={navRef}
      className={`admin-tabbar${swiping ? ' is-swiping' : ''}${reduceMotion() ? ' is-static' : ''}`}
      aria-label="Menú móvil"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {thumb.w > 0 ? (
        <span
          className="admin-tabbar__thumb"
          aria-hidden="true"
          style={{
            width: thumb.w,
            height: thumb.h,
            transform: `translate3d(${thumbX}px, ${thumb.y}px, 0)`,
          }}
        />
      ) : null}
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `admin-tabbar__link${isActive ? ' is-active' : ''}`}
          onClick={(event) => {
            if (dragRef.current.swiping) event.preventDefault()
          }}
        >
          <AdminIcon name={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
