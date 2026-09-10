export type AdminMenuItem = {
  path: string
  label: string
  permission: string
  icon: AdminIconName
  description: string
}

export type AdminIconName =
  | 'home'
  | 'users'
  | 'shield'
  | 'cog'
  | 'building'
  | 'flag'
  | 'sitemap'
  | 'idCard'
  | 'group'
  | 'calendar'
  | 'tags'
  | 'box'
  | 'map'

export const ADMIN_MENU: AdminMenuItem[] = [
  {
    path: '/',
    label: 'Inicio',
    permission: 'dashboard.view',
    icon: 'home',
    description: 'Resumen de tu sesión y accesos según el rol asignado.',
  },
  {
    path: '/usuarios',
    label: 'Usuarios',
    permission: 'users.view',
    icon: 'users',
    description: 'Gestión de usuarios de la plataforma.',
  },
  {
    path: '/roles',
    label: 'Roles',
    permission: 'roles.view',
    icon: 'shield',
    description: 'Administración de roles, páginas y permisos.',
  },
  {
    path: '/configuracion',
    label: 'Configuración',
    permission: 'settings.view',
    icon: 'cog',
    description: 'Correo de la plataforma y apariencia del inicio de sesión.',
  },
  {
    path: '/clubes',
    label: 'Clubes',
    permission: 'clubs.view',
    icon: 'building',
    description: 'Registro de clubes, integrantes y directores.',
  },
  {
    path: '/mi-club',
    label: 'Mi Club',
    permission: 'mi_club.view',
    icon: 'flag',
    description: 'Ficha del club en sesión: ver y actualizar el club seleccionado.',
  },
  {
    path: '/organizaciones',
    label: 'Organizaciones',
    permission: 'organizaciones.view',
    icon: 'sitemap',
    description: 'Jerarquía de organizaciones (Unión, Asociación, Distrito, Iglesia, Club).',
  },
  {
    path: '/personas',
    label: 'Personas',
    permission: 'personas.view',
    icon: 'idCard',
    description: 'Registro general de personas en el alcance de tu contexto.',
  },
  {
    path: '/integrantes',
    label: 'Integrantes',
    permission: 'integrantes.view',
    icon: 'group',
    description: 'Personas asociadas a clubes.',
  },
  {
    path: '/eventos',
    label: 'Eventos',
    permission: 'events.view',
    icon: 'calendar',
    description: 'Gestión de eventos del club.',
  },
  {
    path: '/eventos/catalogos',
    label: 'Categorías y criterios',
    permission: 'events.update',
    icon: 'tags',
    description: 'Catálogos de evaluación para eventos.',
  },
  {
    path: '/seguros',
    label: 'Consultar seguro',
    permission: 'seguros_consulta.view',
    icon: 'shield',
    description: 'Consulta de vigencia de seguros de personas.',
  },
  {
    path: '/servicios',
    label: 'Servicios',
    permission: 'productos_servicios.view',
    icon: 'box',
    description: 'Catálogo de productos y servicios para eventos.',
  },
  {
    path: '/lugares',
    label: 'Lugares',
    permission: 'lugares.view',
    icon: 'map',
    description: 'Catálogo de sedes: mapa, terrenos y cabañas.',
  },
]

export function visibleMenu(can: (permission: string) => boolean): AdminMenuItem[] {
  return ADMIN_MENU.filter((item) => can(item.permission))
}

export function findMenuItem(pathname: string): AdminMenuItem | undefined {
  if (pathname === '/') return ADMIN_MENU[0]
  return [...ADMIN_MENU]
    .filter((item) => item.path !== '/')
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
}
