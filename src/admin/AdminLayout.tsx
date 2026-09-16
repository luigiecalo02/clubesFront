import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { resolveFileUrl } from '../api/baseUrl'
import { authApi } from '../api/auth'
import { useAuth } from '../auth/AuthProvider'
import { useClubesSettings } from '../settings/ClubesSettingsProvider'
import { AdventureScene } from '../components/login/AdventureScene'
import { clubBrandStyle } from '../theme/clubBrand'
import { parseBackgroundStyle } from '../theme/backgroundStyle'
import { useSceneTheme } from '../theme/sceneTheme'
import { AdminIcon } from './AdminIcon'
import { UserMenu } from './UserMenu'
import { resolveAdminPage, visibleMenu } from './menu'
import './admin.css'

const SIDEBAR_KEY = 'clubes_sidebar_collapsed'
const MOBILE_NAV = '(max-width: 900px)'

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

function writeSidebarCollapsed(value: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, value ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
}

function isMobileNav() {
  return window.matchMedia(MOBILE_NAV).matches
}

export function AdminLayout() {
  const auth = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed)
  const [mobileNav, setMobileNav] = useState(isMobileNav)
  const [contextOptions, setContextOptions] = useState(
    auth.user?.menu_options ?? auth.user?.context_options ?? [],
  )
  const { theme } = useSceneTheme()
  const { settings } = useClubesSettings()

  const user = auth.user
  const ctx = user?.contexto
  const kicker = settings?.clubes.kicker || ctx?.tipo_nombre || 'Club de Conquistadores'
  const items = visibleMenu(auth.can, {
    rolName: ctx?.rol_name,
    organizacionId: ctx?.organizacion_id,
  })
  const current = resolveAdminPage(location.pathname) ?? items[0]
  const brand = resolveFileUrl(settings?.clubes.logo_url || (ctx?.is_club ? ctx.club_logo_url : null))

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    authApi
      .contextOptions()
      .then((result) => {
        if (!cancelled) setContextOptions(result.menu_options ?? result.options)
      })
      .catch(() => {
        if (!cancelled) setContextOptions(user.menu_options ?? user.context_options ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [user?.menu_options?.length, user?.context_options?.length, user?.id])

  useEffect(() => {
    const media = window.matchMedia(MOBILE_NAV)
    const sync = () => {
      setMobileNav(media.matches)
      if (!media.matches) setOpen(false)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value
      writeSidebarCollapsed(next)
      return next
    })
  }

  const toggleNav = () => {
    if (mobileNav) {
      setOpen((value) => !value)
      return
    }
    toggleCollapsed()
  }

  if (!user) return null

  return (
    <div
      className={`admin-shell${open ? ' is-open' : ''}${collapsed ? ' admin-shell--collapsed' : ''}${theme === 'day' ? ' admin-shell--day' : ''}`}
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
        backgroundStyle={parseBackgroundStyle(
          theme === 'day'
            ? settings?.clubes.background_day_style
            : settings?.clubes.background_night_style,
        )}
      />
      <div
        className="admin-backdrop"
        hidden={!open}
        onClick={() => setOpen(false)}
      />

      <aside className="admin-sidebar">
        <div className="admin-brand" title={ctx?.organizacion_nombre || 'Clubes'}>
          {brand ? <img src={brand} alt="" className="admin-brand__logo" /> : <span className="admin-brand__mark">C</span>}
          <span className="admin-brand__text">
            <strong>{ctx?.organizacion_nombre || 'Clubes'}</strong>
            <small>{ctx?.tipo_nombre || 'Panel'}</small>
          </span>
        </div>

        <nav className="admin-nav" aria-label="Menú principal">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              title={item.label}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `admin-nav__link${isActive ? ' is-active' : ''}`}
            >
              <AdminIcon name={item.icon} />
              <span className="admin-nav__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="admin-sidebar__collapse"
          onClick={toggleCollapsed}
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Mostrar menú' : 'Minimizar menú'}
          title={collapsed ? 'Mostrar menú' : 'Minimizar menú'}
        >
          <AdminIcon name={collapsed ? 'chevronRight' : 'chevronLeft'} />
          <span className="admin-nav__label">{collapsed ? 'Mostrar' : 'Minimizar'}</span>
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className={`admin-topbar__menu${open ? ' is-open' : ''}${collapsed ? ' is-collapsed' : ''}`}
            onClick={toggleNav}
            aria-label={
              mobileNav
                ? open
                  ? 'Cerrar menú'
                  : 'Abrir menú'
                : collapsed
                  ? 'Mostrar menú'
                  : 'Minimizar menú'
            }
            aria-expanded={mobileNav ? open : !collapsed}
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
            <UserMenu options={contextOptions} />
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
