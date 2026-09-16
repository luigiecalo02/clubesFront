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
  | 'check'
  | 'tags'
  | 'box'
  | 'map'
  | 'grid'
  | 'user'
  | 'sun'
  | 'moon'
  | 'logout'
  | 'download'
  | 'undo'
  | 'crown'
  | 'globe'
  | 'compass'
  | 'star'
  | 'eye'
  | 'wallet'

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
    description: 'Apariencia y textos del club en este front. Cada organización tiene la suya.',
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
    description: 'Eventos del club en cuadrícula o cronograma.',
  },
  {
    path: '/asistencia',
    label: 'Asistencia',
    permission: 'asistencia.view',
    icon: 'check',
    description: 'Relaciona la asistencia de un evento con los integrantes del club.',
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

export function isClubDirectorRole(rolName: string | null | undefined): boolean {
  return rolName === 'director'
}

export function canManageClubDirectors(options?: {
  can?: (permission: string) => boolean
  rolName?: string | null
  organizacionId?: number | null
}): boolean {
  if (options?.can?.('mi_club.manage_directors') || options?.can?.('clubs.manage_directors')) {
    return true
  }
  return Boolean(options?.organizacionId) && ['director', 'subdirector'].includes(options?.rolName ?? '')
}

export function canAccessClubSettings(options?: {
  rolName?: string | null
  organizacionId?: number | null
}): boolean {
  return isClubDirectorRole(options?.rolName) && Boolean(options?.organizacionId)
}

export function canAccessClubAttendance(options?: {
  rolName?: string | null
  organizacionId?: number | null
}): boolean {
  return Boolean(options?.organizacionId) && ['director', 'subdirector', 'secretario'].includes(options?.rolName ?? '')
}

function canWriteClubEvent(options?: {
  can?: (permission: string) => boolean
  rolName?: string | null
  organizacionId?: number | null
}): boolean {
  if (
    options?.can?.('events.create') ||
    options?.can?.('events.create_organization') ||
    options?.can?.('events.update')
  ) {
    return true
  }
  return Boolean(options?.organizacionId) && ['director', 'subdirector', 'secretario'].includes(
    options?.rolName ?? '',
  )
}

export function canCreateClubEvent(options?: {
  can?: (permission: string) => boolean
  rolName?: string | null
  organizacionId?: number | null
}): boolean {
  return canWriteClubEvent(options)
}

export function canUpdateClubEvent(options?: {
  can?: (permission: string) => boolean
  rolName?: string | null
  organizacionId?: number | null
}): boolean {
  return canWriteClubEvent(options)
}

export function canCreateClubMember(options?: {
  can?: (permission: string) => boolean
  rolName?: string | null
  organizacionId?: number | null
}): boolean {
  if (
    options?.can?.('integrantes.create') ||
    options?.can?.('personas.create') ||
    options?.can?.('mi_club.manage_members') ||
    options?.can?.('clubs.manage_members')
  ) {
    return true
  }
  return Boolean(options?.organizacionId) && ['director', 'subdirector', 'secretario'].includes(
    options?.rolName ?? '',
  )
}

export function canUpdateClubMember(options?: {
  can?: (permission: string) => boolean
  rolName?: string | null
  organizacionId?: number | null
}): boolean {
  if (
    options?.can?.('integrantes.update') ||
    options?.can?.('personas.update') ||
    options?.can?.('mi_club.manage_members') ||
    options?.can?.('clubs.manage_members')
  ) {
    return true
  }
  return Boolean(options?.organizacionId) && ['director', 'subdirector', 'secretario'].includes(
    options?.rolName ?? '',
  )
}

export function canImpersonateClubMember(options?: {
  can?: (permission: string) => boolean
  rolName?: string | null
  organizacionId?: number | null
}): boolean {
  if (options?.can?.('users.view') || options?.can?.('clubs.manage_members') || options?.can?.('mi_club.manage_members')) {
    return true
  }
  return Boolean(options?.organizacionId) && ['director', 'subdirector'].includes(options?.rolName ?? '')
}

export function canManageMemberPhotos(options?: {
  can?: (permission: string) => boolean
  rolName?: string | null
  organizacionId?: number | null
}): boolean {
  if (options?.can?.('integrantes.manage_photos')) {
    return true
  }
  if (isClubDirectorRole(options?.rolName) && Boolean(options?.organizacionId)) {
    return true
  }
  return canCreateClubMember(options) || canUpdateClubMember(options)
}

export function visibleMenu(
  can: (permission: string) => boolean,
  options?: { rolName?: string | null; organizacionId?: number | null },
): AdminMenuItem[] {
  return ADMIN_MENU.filter((item) => {
    if (item.path === '/configuracion') {
      return canAccessClubSettings(options)
    }
    if (item.path === '/asistencia') {
      return canAccessClubAttendance(options) || can(item.permission)
    }
    return can(item.permission)
  })
}

export function findMenuItem(pathname: string): AdminMenuItem | undefined {
  if (pathname === '/') return ADMIN_MENU[0]
  return [...ADMIN_MENU]
    .filter((item) => item.path !== '/')
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
}

export const PROFILE_PAGE: AdminMenuItem = {
  path: '/perfil',
  label: 'Mi perfil',
  permission: '',
  icon: 'user',
  description: 'Actualiza tus datos personales y tu contraseña.',
}

export function resolveAdminPage(pathname: string): AdminMenuItem | undefined {
  if (pathname === PROFILE_PAGE.path || pathname.startsWith(`${PROFILE_PAGE.path}/`)) {
    return PROFILE_PAGE
  }
  return findMenuItem(pathname)
}
