import { Link } from 'react-router-dom'
import { AdminIcon } from '../admin/AdminIcon'
import { visibleMenu } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'

export function DashboardPage() {
  const auth = useAuth()
  const user = auth.user
  const ctx = user?.contexto
  const modules = visibleMenu(auth.can).filter((item) => item.path !== '/')

  if (!user) return null

  return (
    <section className="admin-page">
      <header className="admin-page__intro">
        <p className="admin-kicker">Bienvenido</p>
        <h2>Hola, {user.name}</h2>
        <p>
          Estás trabajando como <strong>{ctx?.rol_display_name || user.roles[0] || 'usuario'}</strong>
          {ctx?.organizacion_nombre ? ` en ${ctx.organizacion_nombre}` : ''}. El menú muestra solo lo que tu rol
          puede ver.
        </p>
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
