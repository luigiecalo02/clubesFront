import { Link } from 'react-router-dom'
import { resolveFileUrl } from '../api/baseUrl'
import { AdminIcon } from '../admin/AdminIcon'
import { visibleMenu } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import { useClubesSettings } from '../settings/ClubesSettingsProvider'

export function DashboardPage() {
  const auth = useAuth()
  const { settings } = useClubesSettings()
  const user = auth.user
  const ctx = user?.contexto
  const copy = settings?.clubes
  const modules = visibleMenu(auth.can, {
    rolName: ctx?.rol_name,
    organizacionId: ctx?.organizacion_id,
  }).filter((item) => item.path !== '/')

  const banner = resolveFileUrl(copy?.banner_url)

  if (!user) return null

  return (
    <section className="admin-page">
      {banner ? <img src={banner} alt="" className="admin-banner" /> : null}
      <header className="admin-page__intro">
        <p className="admin-kicker">{copy?.kicker || 'Bienvenido'}</p>
        <h2>Hola, {user.name}</h2>
        <p>
          {copy?.motto ? <strong>{copy.motto}. </strong> : null}
          Estás trabajando como <strong>{ctx?.rol_display_name || user.roles[0] || 'usuario'}</strong>
          {ctx?.organizacion_nombre ? ` en ${ctx.organizacion_nombre}` : ''}. El menú muestra solo lo que tu rol
          puede ver.
        </p>
        {copy?.values ? <p>{copy.values}</p> : null}
      </header>

      <div className="admin-stats">
        <article>
          <small>Contexto</small>
          <strong>{ctx?.organizacion_nombre || 'Plataforma'}</strong>
        </article>
        <article>
          <small>Rol</small>
          <strong>{ctx?.rol_display_name || user.roles.join(', ') || '—'}</strong>
        </article>
        <article>
          <small>Módulos visibles</small>
          <strong>{modules.length}</strong>
        </article>
      </div>

      {modules.length ? (
        <div className="admin-grid">
          {modules.map((item) => (
            <Link key={item.path} to={item.path} className="admin-card">
              <AdminIcon name={item.icon} />
              <h3>{item.label}</h3>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="admin-empty">Tu rol no tiene módulos adicionales asignados por ahora.</p>
      )}
    </section>
  )
}
