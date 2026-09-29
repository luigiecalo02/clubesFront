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
  color_principal?: string | null
  color_secundario?: string | null
  host?: string | null
  origin?: string | null
  current_tenant?: boolean
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
  persona_id?: number | null
  requires_context?: boolean
  contexto?: AuthContextOption | null
  context_options?: AuthContextOption[]
  menu_options?: AuthContextOption[]
  impersonated?: boolean
  impersonator?: {
    id: number
    name: string
    email: string
    avatar_url?: string | null
  } | null
}

export interface TenantHandoff {
  code: string
  host: string
  origin: string
}

export interface LoginResult {
  token: string
  user: AuthUser
}

export interface ClubesInviteLink {
  url: string
  expires_at: string
  organizacion_id: number
  organizacion_nombre: string
}

export interface ClubesInvitePreview {
  organizacion_id: number
  organizacion_nombre: string
  expires_at: string
}

export interface ClubesInvitePersona {
  tipo_identificacion?: string | null
  identificacion?: string | null
  nombre1?: string | null
  nombre2?: string | null
  apellido1?: string | null
  apellido2?: string | null
  correo?: string | null
  telefono?: string | null
  sexo?: string | null
  fecha_nacimiento?: string | null
}

export interface ClubesInviteLookup {
  organizacion_id: number
  organizacion_nombre: string
  persona: ClubesInvitePersona
  missing: string[]
  has_user: boolean
  path: PublicOrg[]
}

export interface PublicOrg {
  id: number
  nombre: string
  tipo_organizacion_id: number
  tipo_nombre: string
  is_club: boolean
}

export interface PublicOrgBrowse {
  path: PublicOrg[]
  children: PublicOrg[]
}

export interface ClubesRegisterPayload {
  organizacion_id: number
  nombre1: string
  apellido1: string
  correo: string
  password: string
  password_confirmation: string
  tipo_identificacion: 'CC' | 'TI' | 'CE' | 'PA'
  identificacion: string
  telefono?: string
  sexo?: 'M' | 'F' | ''
}

export type ClubesAssetKey = 'logo' | 'background' | 'banner' | 'background_night' | 'background_day'

export type ClubesBackgroundStyle = 'cover' | 'contain' | 'mosaic' | 'stack' | 'stretch'

export interface MailSettings {
  host: string
  port: number
  encryption: 'tls' | 'ssl' | 'none'
  username: string
  from_address: string
  from_name: string
  password: string
  password_set: boolean
  configured: boolean
}

export interface ClubesAppConfig {
  source: string
  scene_theme: 'night' | 'day'
  kicker: string
  title: string
  subtitle: string
  motto: string
  values: string
  color_principal?: string | null
  color_secundario?: string | null
  background_style?: ClubesBackgroundStyle
  background_night_style?: ClubesBackgroundStyle
  background_day_style?: ClubesBackgroundStyle
  logo_url?: string | null
  background_url?: string | null
  banner_url?: string | null
  background_night_url?: string | null
  background_day_url?: string | null
}

export interface ClubesSettings {
  id: number
  organizacion_id: number | null
  organizacion_nombre: string | null
  is_platform: boolean
  initialized: boolean
  clubes: ClubesAppConfig
  updated_at: string | null
}

export interface ClubesPublicBranding {
  organizacion_id: number | null
  organizacion_nombre: string | null
  tipo_nombre: string | null
  loader_key: 'conquistadores' | 'aventureros' | 'guias_mayores' | 'neutral' | string
  logo_url: string | null
  background_url?: string | null
  banner_url?: string | null
  clubes: ClubesAppConfig
}

export const DEFAULT_LOGIN_BRANDING: ClubesPublicBranding = {
  organizacion_id: null,
  organizacion_nombre: null,
  tipo_nombre: null,
  loader_key: 'conquistadores',
  logo_url: null,
  background_url: null,
  banner_url: null,
  clubes: {
    source: 'clubes',
    scene_theme: 'night',
    kicker: 'Club de Conquistadores',
    title: 'CONQUISTADORES',
    subtitle: 'Conectados con la misión',
    motto: 'Una misión, un propósito',
    values: 'Disciplina · Servicio · Amor',
    background_style: 'cover',
    background_night_style: 'cover',
    background_day_style: 'cover',
    logo_url: null,
    background_url: null,
    banner_url: null,
    background_night_url: null,
    background_day_url: null,
  },
}

export interface ClubOrganization {
  id: number
  nombre: string
  codigo?: string | null
  tipo_organizacion_id?: number | null
  organizacion_padre_id?: number | null
  padre?: {
    id: number
    nombre: string
    codigo?: string | null
  } | null
}

export type PersonaIdType = 'CC' | 'TI' | 'CE' | 'PA'

export interface ClubPerson {
  id: number
  user_id?: number | null
  tipo_identificacion?: string | null
  identificacion?: string | null
  nombre1?: string | null
  nombre2?: string | null
  apellido1?: string | null
  apellido2?: string | null
  fecha_nacimiento?: string | null
  sexo?: string | null
  correo?: string | null
  telefono?: string | null
  direccion_actual?: string | null
  foto?: string | null
  foto_url?: string | null
  full_name: string
  organizaciones?: Array<{
    organizacion_id: number
    organizacion_nombre?: string | null
    estado: boolean
  }>
}

export type CreatePersonaPayload = {
  tipo_identificacion: PersonaIdType
  identificacion: string
  nombre1: string
  nombre2?: string
  apellido1: string
  apellido2?: string
  fecha_nacimiento?: string
  sexo?: 'M' | 'F' | ''
  telefono?: string
  correo?: string
  direccion_actual?: string
  organizacion_ids?: number[]
  solo_tipo_club?: boolean
}

export interface ClubDirector {
  ministry: string
  user_id?: number | null
  persona_id?: number | null
  user?: { id: number; name: string; email: string } | null
  persona?: { id: number; full_name: string; correo?: string | null } | null
}

export type ClubBoardPosition = 'director' | 'subdirector' | 'secretaria' | 'tesorero'

export type ClubDirectorAssignment =
  | { clear: true }
  | { mode: 'select'; persona_id: number }

export interface ClubDetail {
  id: number
  organizacion_id: number
  iglesia_organizacion_id?: number | null
  organizacion?: ClubOrganization | null
  nombre: string
  nombre_corto?: string | null
  lema?: string | null
  logo?: string | null
  logo_url?: string | null
  fecha_fundacion?: string | null
  descripcion?: string | null
  color_principal?: string | null
  color_secundario?: string | null
  sitio_web?: string | null
  zona?: string | null
  distrito?: string | null
  ciudad?: string | null
  tipos: string[]
  is_active: boolean
  personas_count?: number | null
  directors: ClubDirector[]
  personas?: ClubPerson[]
}

export interface EventTipo {
  id: number
  nombre: string
  slug?: string | null
  color?: string | null
  icono?: string | null
}

export interface EventSummary {
  id: number
  evento_padre_id?: number | null
  tiene_subeventos?: boolean
  hijos_count?: number
  name: string,
  descripcion?: string | null
  lugar?: string | null
  starts_at?: string | null
  ends_at?: string | null
  estado?: string | null
  visibilidad?: string | null
  organizacion?: { id: number; nombre: string; codigo?: string | null } | null
  tipo_evento?: EventTipo | null
  inscritos_count?: number
  inscrito?: boolean
  image_url?: string | null
  banner_url?: string | null
}

export type AttendanceEstado = 'presente' | 'ausente' | 'justificado' | 'puntual'

export interface AttendanceEvent extends EventSummary {
  integrantes_count?: number
  presentes_count?: number
  asistencias_count?: number
}

export interface AttendanceMember {
  persona_id: number
  full_name: string
  identificacion?: string | null
  foto_url?: string | null
  estado?: AttendanceEstado | null
  notas?: string | null
}

export interface AttendanceResumen {
  total: number
  presentes: number
  puntuales?: number
  ausentes: number
  justificados: number
  sin_marcar: number
}

export interface AttendanceRoster {
  evento: EventSummary
  integrantes: AttendanceMember[]
  resumen: AttendanceResumen
}

export interface AttendanceRankRow {
  persona_id: number
  full_name: string
  identificacion?: string | null
  foto_url?: string | null
  presentes: number
  puntuales?: number
  ausentes: number
  justificados: number
  sin_marcar: number
  eventos: number
  puntos?: number
  porcentaje: number
}

export interface AttendanceHistoryEvent {
  id: number
  name: string
  starts_at?: string | null
  image_url?: string | null
  estado?: AttendanceEstado | null
  puntos: number
}

export interface AttendanceMemberHistory {
  persona_id: number
  full_name: string
  foto_url?: string | null
  desde?: string | null
  hasta?: string | null
  presentes: number
  puntuales: number
  justificados: number
  ausentes: number
  sin_marcar: number
  eventos: number
  puntos: number
  porcentaje: number
  registros: AttendanceHistoryEvent[]
}

export interface AttendanceRanking {
  eventos: number
  desde?: string | null
  hasta?: string | null
  integrantes: AttendanceRankRow[]
}

export interface ClubIcono {
  id: number
  nombre: string
  slug: string
  categoria: string
  etiquetas: string[]
  tipo: 'prime' | 'imagen' | string
  valor: string
  url?: string | null
}

export interface ClubServicio {
  id: number
  organizacion_id?: number | null
  nombre: string
  tipo?: string | null
  descripcion?: string | null
  precio: number | string
  unidad?: string | null
  image_url?: string | null
  icono?: string | null
  activo: boolean
}

export interface EventoServicioOferta {
  id: number
  evento_id: number
  producto_servicio_id: number
  precio: number | string
  activo: boolean
  producto?: ClubServicio | null
}

export interface EventoServicios {
  evento: {
    id: number
    name: string
    es_economica?: boolean
  }
  catalogo: ClubServicio[]
  ofertas: EventoServicioOferta[]
}

export interface EventParticipantVenta {
  producto_servicio_id: number
  cantidad: number
}

export interface EventParticipant {
  persona_id: number
  full_name: string
  identificacion?: string | null
  foto_url?: string | null
  participa?: boolean | null
  ventas?: EventParticipantVenta[]
  abonado?: number
  abonos?: AbonoMovimiento[]
}

export interface EventParticipantService {
  id: number
  nombre: string
  precio?: number | string
  icono?: string | null
  image_url?: string | null
}

export interface EventParticipantsResumen {
  total: number
  participan: number
  no_participan: number
  sin_marcar: number
  unidades?: number
}

export interface EventParticipantsRoster {
  evento: EventSummary
  servicios?: EventParticipantService[]
  integrantes: EventParticipant[]
  resumen: EventParticipantsResumen
}

export interface EventSelfParticipation {
  evento: EventSummary
  servicios: EventParticipantService[]
  integrante: EventParticipant
  recaudo?: {
    abonado: number
    abonos: AbonoMovimiento[]
  }
}

export type AbonosModo = 'integrante' | 'actividad'

export interface AbonoOption {
  id: number
  nombre: string
  starts_at?: string | null
  foto_url?: string | null
  image_url?: string | null
}

export interface AbonoMovimiento {
  id: number
  monto: number
  nota?: string | null
  created_at?: string | null
}

export interface AbonoPedido {
  id: number
  nombre: string
  cantidad: number
  precio: number
  total: number
  icono?: string | null
  image_url?: string | null
}

export interface AbonoFila {
  persona_id?: number | null
  full_name?: string | null
  foto_url?: string | null
  evento_id?: number | null
  evento_name?: string | null
  image_url?: string | null
  starts_at?: string | null
  comprometido: number
  abonado: number
  pendiente: number
  items?: number
  pendientes?: number
  pedidos?: AbonoPedido[]
  abonos?: AbonoMovimiento[]
}

export interface AbonosBoard {
  modo: AbonosModo
  persona_id?: number | null
  evento_id?: number | null
  resumen: {
    comprometido: number
    abonado: number
    pendiente: number
  }
  opciones_integrantes: AbonoOption[]
  opciones_actividades: AbonoOption[]
  filas: AbonoFila[]
}
