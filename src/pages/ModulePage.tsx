import type { AdminMenuItem } from '../admin/menu'
import { AdminIcon } from '../admin/AdminIcon'
import { useAuth } from '../auth/AuthProvider'

const ACTION_LABELS: Record<string, string> = {
  view: 'Ver',
  create: 'Crear',
  update: 'Actualizar',
  delete: 'Eliminar',
  assign_roles: 'Asignar roles',
  assign_permissions: 'Asignar permisos',
  manage_members: 'Gestionar integrantes',
  manage_directors: 'Gestionar directiva',
  evaluate: 'Evaluar',
  view_scores: 'Ver puntajes',
  change_status: 'Cambiar estado',
}

function moduleKey(permission: string): string {
  return permission.split('.')[0] ?? permission
}

export function ModulePage({ item }: { item: AdminMenuItem }) {
  const auth = useAuth()
  const prefix = `${moduleKey(item.permission)}.`
  const actions = (auth.user?.permissions ?? [])
    .filter((permission) => permission.startsWith(prefix))
    .map((permission) => {
      const action = permission.slice(prefix.length)
      return ACTION_LABELS[action] ?? action.replaceAll('_', ' ')
    })

  return (
    <section className="admin-page">
      <header className="admin-page__intro">
        <p className="admin-kicker">Módulo</p>
        <h2>
          <AdminIcon name={item.icon} />
          {item.label}
        </h2>
        <p>{item.description}</p>
      </header>

      {actions.length ? (
        <ul className="admin-actions">
          {actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      ) : null}

      <div className="admin-panel">
        <h3>Listado</h3>
        <p>
          Esta vista ya está disponible en tu menú porque tu rol incluye{' '}
          <code>{item.permission}</code>. El CRUD se conectará al API de ProjectJA en el siguiente paso.
        </p>
      </div>
    </section>
  )
}
