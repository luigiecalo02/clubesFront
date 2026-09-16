import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { resolveFileUrl } from '../api/baseUrl'
import type { AuthContextOption } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { activateContext, isRemoteContext } from '../auth/activateContext'
import { usePwaInstall } from '../pwa/usePwaInstall'
import { AppPanel } from '../theme/AppPanel'
import { useSceneTheme } from '../theme/sceneTheme'
import { AdminIcon, roleIconName } from './AdminIcon'

type UserMenuProps = {
  options: AuthContextOption[]
}

type MenuAnchor = {
  top: number
  right: number
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

function readAnchor(trigger: HTMLElement | null): MenuAnchor | null {
  if (!trigger) return null
  const rect = trigger.getBoundingClientRect()
  return {
    top: rect.bottom + 8,
    right: Math.max(12, window.innerWidth - rect.right),
  }
}

export function UserMenu({ options }: UserMenuProps) {
  const auth = useAuth()
  const navigate = useNavigate()
  const pwa = usePwaInstall()
  const { theme, toggleTheme } = useSceneTheme()
  const user = auth.user
  const ctx = user?.contexto
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const canSwitch = options.length > 1
  const roleLabel = ctx?.rol_display_name || ctx?.rol_name || user?.roles[0] || 'Sin rol'
  const photo = resolveFileUrl(user?.avatar_url)
  const homePhoto = resolveFileUrl(user?.impersonator?.avatar_url)

  useLayoutEffect(() => {
    if (!open) return
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
    if (!open) return
    function onPointer(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if ((target as Element).closest?.('.admin-user-menu__panel')) return
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

  if (!user) return null

  async function choose(option: AuthContextOption) {
    if (option.key === ctx?.key) {
      setOpen(false)
      return
    }
    setSaving(option.key)
    try {
      const mode = await activateContext(option, auth.switchContext)
      if (mode === 'remote') return
      setOpen(false)
    } catch {
      setSaving(null)
      return
    }
    setSaving(null)
  }

  const panel =
    open && anchor
      ? createPortal(
          <AppPanel
            as="div"
            className={`admin-user-menu__panel${theme === 'day' ? ' is-day' : ''}`}
            shine={false}
            role="menu"
            aria-label="Cuenta"
            style={{ top: anchor.top, right: anchor.right }}
          >
            <div className="admin-user-menu__who">
              <strong>{user.name}</strong>
              <small>{roleLabel}</small>
              {ctx?.organizacion_nombre ? <span>{ctx.organizacion_nombre}</span> : null}
            </div>

            {canSwitch ? (
              <div className="admin-user-menu__group">
                <p className="admin-user-menu__label">Cambiar rol</p>
                {options.map((option) => {
                  const active = option.key === ctx?.key
                  const remote = isRemoteContext(option)
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      className={active ? 'is-on' : undefined}
                      disabled={saving !== null}
                      onClick={() => void choose(option)}
                    >
                      <AdminIcon name={roleIconName(option)} />
                      <span className="admin-user-menu__copy">
                        <strong>{option.rol_display_name || option.rol_name}</strong>
                        <span>{option.organizacion_nombre}</span>
                        {remote && !active ? <span>Abrir en el otro club</span> : null}
                        {saving === option.key ? <em>{remote ? 'Abriendo…' : 'Cambiando…'}</em> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}

            <div className="admin-user-menu__group">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  navigate('/perfil')
                }}
              >
                <AdminIcon name="user" />
                <span>Ver mi perfil</span>
              </button>
              <button type="button" role="menuitem" onClick={toggleTheme}>
                <AdminIcon name={theme === 'day' ? 'moon' : 'sun'} />
                <span>{theme === 'day' ? 'Cambiar a noche' : 'Cambiar a día'}</span>
              </button>
              {pwa.canInstall ? (
                <button type="button" role="menuitem" onClick={() => void pwa.install()}>
                  <AdminIcon name="download" />
                  <span>Instalar app</span>
                </button>
              ) : null}
              {user.impersonated ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void auth
                      .stopImpersonation()
                      .then(() => {
                        setOpen(false)
                        navigate('/integrantes')
                      })
                      .catch(() => undefined)
                  }}
                >
                  <span className="admin-user-menu__avatar admin-user-menu__avatar--sm">
                    {homePhoto ? (
                      <img src={homePhoto} alt="" />
                    ) : (
                      <span aria-hidden="true">{initials(user.impersonator?.name || user.name)}</span>
                    )}
                  </span>
                  <span>Volver a mi cuenta</span>
                </button>
              ) : (
                <button type="button" role="menuitem" onClick={() => void auth.logout()}>
                  <AdminIcon name="logout" />
                  <span>Cerrar sesión</span>
                </button>
              )}
            </div>
          </AppPanel>,
          document.body,
        )
      : null

  return (
    <div className="admin-user-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="admin-user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${user.name}, ${roleLabel}`}
        onClick={() => {
          setAnchor(readAnchor(triggerRef.current))
          setOpen((value) => !value)
        }}
      >
        <span className="admin-user-menu__avatar">
          {photo ? <img src={photo} alt="" /> : <span aria-hidden="true">{initials(user.name)}</span>}
        </span>
        <span className="admin-user-menu__meta" aria-hidden="true">
          <strong>{user.name}</strong>
          <small>{roleLabel}</small>
          {ctx?.organizacion_nombre ? <span>{ctx.organizacion_nombre}</span> : null}
        </span>
      </button>
      {panel}
    </div>
  )
}
