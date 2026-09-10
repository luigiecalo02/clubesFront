import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuth } from '../auth/AuthProvider'
import { usePwaInstall } from '../pwa/usePwaInstall'
import { AdminIcon } from './AdminIcon'
import { findMenuItem, visibleMenu } from './menu'
import './admin.css'

function resolveFileUrl(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
  return `${base}${value.startsWith('/') ? value : `/${value}`}`
}

export function AdminLayout() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [canSwitch, setCanSwitch] = useState(
    (auth.user?.context_options?.length ?? 0) > 1,
  )
  const pwa = usePwaInstall()

  const user = auth.user
  const ctx = user?.contexto
  const items = visibleMenu(auth.can)
  const current = findMenuItem(location.pathname) ?? items[0]
  const brand = resolveFileUrl(ctx?.is_club ? ctx.club_logo_url : null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    authApi
      .contextOptions()
      .then((result) => {
        if (!cancelled) setCanSwitch(result.options.length > 1)
      })
      .catch(() => {
        if (!cancelled) setCanSwitch((user.context_options?.length ?? 0) > 1)
      })
    return () => {
      cancelled = true
    }
  }, [user?.context_options?.length, user?.id])

  if (!user) return null

  return (
    <div className={`admin-shell${open ? ' is-open' : ''}`}>
      <div
        className="admin-backdrop"
        hidden={!open}
        onClick={() => setOpen(false)}
      />

      <aside className="admin-sidebar">
        <button
          type="button"
          className={`admin-brand${canSwitch ? ' is-action' : ''}`}
          onClick={() => {
            if (canSwitch) navigate('/contexto')
          }}
        >
          {brand ? <img src={brand} alt="" className="admin-brand__logo" /> : <span className="admin-brand__mark">C</span>}
          <span>
            <strong>{ctx?.organizacion_nombre || 'Clubes'}</strong>
            <small>{ctx?.rol_display_name || ctx?.tipo_nombre || 'Panel'}</small>
          </span>
        </button>

        <nav className="admin-nav" aria-label="Menú principal">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) => `admin-nav__link${isActive ? ' is-active' : ''}`}
            >
              <AdminIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-topbar__menu"
            onClick={() => setOpen((value) => !value)}
            aria-label="Abrir menú"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="admin-topbar__title">
            {current ? <AdminIcon name={current.icon} /> : null}
            <div>
              <p>{ctx?.tipo_nombre || 'Club de Conquistadores'}</p>
              <h1>{current?.label || 'Panel'}</h1>
            </div>
          </div>

          <div className="admin-topbar__user">
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            {pwa.canInstall ? (
              <button type="button" className="admin-ghost" onClick={() => void pwa.install()}>
                Instalar app
              </button>
            ) : null}
            {canSwitch ? (
              <button type="button" className="admin-ghost" onClick={() => navigate('/contexto')}>
                Cambiar contexto
              </button>
            ) : null}
            <button type="button" className="admin-ghost" onClick={() => void auth.logout()}>
              Salir
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
