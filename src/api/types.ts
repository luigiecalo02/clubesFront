export interface PaginationMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
  from?: number | null
  to?: number | null
}

export interface ApiEnvelope<T = unknown> {
  success: boolean
  message: string | null
  data: T
  errors: Record<string, string[]> | null
  pagination: PaginationMeta | null
  meta: Record<string, unknown> | null
}

export interface AuthContextOption {
  key: string
  organizacion_id: number | null
  organizacion_nombre: string
  organizacion_codigo?: string | null
  tipo_organizacion_id?: number | null
  tipo_nombre?: string | null
  rol_id: number
  rol_name: string
  rol_display_name: string
  descripcion?: string | null
  theme?: string
  icon?: string
  is_platform?: boolean
  is_club?: boolean
  club_id?: number | null
  club_tipos?: string[]
  club_logo_url?: string | null
}

export interface AuthUser {
  id: number
  name: string
  email: string
  avatar_url: string | null
  is_active: boolean
  roles: string[]
  permissions: string[]
  is_super?: boolean
  is_admin?: boolean
  requires_context?: boolean
  contexto?: AuthContextOption | null
  context_options?: AuthContextOption[]
}

export interface LoginResult {
  token: string
  user: AuthUser
}
