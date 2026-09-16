import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { resolveFileUrl } from '../api/baseUrl'
import { authApi } from '../api/auth'
import { useAuth } from '../auth/AuthProvider'
import { useClubesSettings } from '../settings/ClubesSettingsProvider'
import { AdventureScene } from '../components/login/AdventureScene'
import { usePwaInstall } from '../pwa/usePwaInstall'
import { SceneThemeToggle } from '../theme/SceneThemeToggle'
import { clubBrandStyle } from '../theme/clubBrand'
import { useSceneTheme } from '../theme/sceneTheme'
import { AdminIcon } from './AdminIcon'
import { findMenuItem, visibleMenu } from './menu'
import './admin.css'

export function AdminLayout() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [canSwitch, setCanSwitch] = useState(
    (auth.user?.context_options?.length ?? 0) > 1,
  )
  const pwa = usePwaInstall()
  const { theme, toggleTheme } = useSceneTheme()
  const { settings } = useClubesSettings()

  const user = auth.user
  const ctx = user?.contexto
  const kicker = settings?.clubes.kicker || ctx?.tipo_nombre || 'Club de Conquistadores'
  const items = visibleMenu(auth.can, {
    rolName: ctx?.rol_name,
    organizacionId: ctx?.organizacion_id,
  })
  const current = findMenuItem(location.pathname) ?? items[0]
  const brand = resolveFileUrl(settings?.clubes.logo_url || (ctx?.is_club ? ctx.club_logo_url : null))

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
    <div
      className={`admin-shell${open ? ' is-open' : ''}${theme === 'day' ? ' admin-shell--day' : ''}`}
      style={clubBrandStyle(settings?.clubes.color_principal || ctx?.color_principal)}
    >
      <AdventureScene
        theme={theme}
        variant="backdrop"
        backgroundUrl={resolveFileUrl(
          theme === 'day'
            ? settings?.clubes.background_day_url
            : settings?.clubes.background_night_url,
        )}
      />
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
            className={`admin-topbar__menu${open ? ' is-open' : ''}`}
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="admin-topbar__title">
            {current ? <AdminIcon name={current.icon} /> : null}
            <div>
              <p>{kicker}</p>
              <h1>{current?.label || 'Panel'}</h1>
            </div>
          </div>

          <div className="admin-topbar__user">
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            <SceneThemeToggle theme={theme} onToggle={toggleTheme} compact />
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
            {user.impersonated ? (
              <button
                type="button"
                className="admin-ghost"
                onClick={() => {
                  void auth
                    .stopImpersonation()
                    .then(() => navigate('/integrantes'))
                    .catch(() => undefined)
                }}
              >
                Volver
              </button>
            ) : (
              <button type="button" className="admin-ghost" onClick={() => void auth.logout()}>
                Salir
              </button>
            )}
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
