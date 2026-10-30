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
  activo: boolean
  url: string | null
  expires_at?: string | null
  organizacion_id: number
  organizacion_nombre: string
}

export interface ClubesInvitePreview {
  organizacion_id: number
  organizacion_nombre: string
  expires_at?: string | null
  path?: PublicOrg[]
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
  token: string
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
  ganancia_eclesiastica_id?: number | null
  cuenta_bancaria_id?: number | null
  cuenta_bancaria?: CuentaBancariaClub | null
  capital?: number | string | null
  ganancia_registro?: EventoGananciaRegistro | null
  inscritos_count?: number
  participantes_count?: number
  asistentes_count?: number
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
  inscrito?: boolean
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

export interface EventoGananciaRegistro {
  proyeccion: number
  capital: number
  ganancia: number
  ofrenda: number
  diezmo: number
  resto: number
  participantes: number
  club: number
  extras: number
}

export interface EventoServicioOferta {
  id: number
  evento_id: number
  producto_servicio_id: number
  precio: number | string
  cantidad_proyectada?: number | null
  inversion?: number | string | null
  total?: number | string | null
  ganancia_unidad?: number | string | null
  activo: boolean
  producto?: ClubServicio | null
}

export interface EventoServicios {
  evento: {
    id: number
    name: string
    es_economica?: boolean
    tiene_abonos?: boolean
    ganancia_registro?: EventoGananciaRegistro | null
  }
  catalogo: ClubServicio[]
  ofertas: EventoServicioOferta[]
}

export interface EventParticipantVenta {
  producto_servicio_id: number
  cantidad: number
  cantidad_entregada?: number | null
}

export interface EventParticipant {
  persona_id: number
  full_name: string
  identificacion?: string | null
  foto_url?: string | null
  participa?: boolean | null
  ventas?: EventParticipantVenta[]
  abonado?: number
  ajuste_participantes?: number
  abonos?: AbonoMovimiento[]
}

export interface EventParticipantService {
  id: number
  nombre: string
  precio?: number | string
  ganancia_unidad?: number | string | null
  inversion?: number | string | null
  cantidad_proyectada?: number | null
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
    ajuste_participantes?: number
    abonos: AbonoMovimiento[]
  }
  ganancia?: {
    capital: number
    proyeccion_otros: number
    reparto?: {
      ofrenda: number
      diezmo: number
      resto: number
      miembros: number
      club: number
      extras: number
    } | null
    capital_propio?: number
    unidades?: number
    capital_unidad?: number
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
  estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'eliminado' | string | null
  producto_servicio_id?: number | null
  producto_nombre?: string | null
  comprobante_url?: string | null
  created_at?: string | null
}

export interface AbonoRevision {
  abono: AbonoMovimiento
  persona_id: number
  evento_id: number
  abonado: number
  abonos?: AbonoMovimiento[]
}

export interface AbonoRecaudo {
  abonado: number
  abonos: AbonoMovimiento[]
}

export interface AbonoPedido {
  id: number
  venta_id?: number
  producto_servicio_id?: number
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
  banner_url?: string | null
  starts_at?: string | null
  evento_estado?: string | null
  comprometido: number
  abonado: number
  pendiente: number
  ganancia?: number
  items?: number
  pendientes?: number
  cuenta_bancaria?: CuentaBancariaClub | null
  pedidos?: AbonoPedido[]
  abonos?: AbonoMovimiento[]
}

export interface GananciaDistribucion {
  id: number
  organizacion_id: number
  nombre: string
  club: number
  miembros: number
  extras: number
  es_predeterminada: boolean
}

export type CuentaBancariaTipo = 'ahorros' | 'corriente'

export interface CuentaBancariaClub {
  id: number
  organizacion_id?: number | null
  nombre: string
  banco?: string | null
  tipo_cuenta: CuentaBancariaTipo | string
  numero_cuenta: string
  titular?: string | null
  identificacion_titular?: string | null
  activo: boolean
  orden?: number
  qr_url?: string | null
}

export interface GananciaEclesiastica {
  id: number
  organizacion_id: number
  nombre: string
  diezmo: number
  ofrenda: number
  resto: number
  distribucion_id: number
  distribucion?: GananciaDistribucion | null
  es_predeterminada: boolean
}

export interface AbonosBoard {
  modo: AbonosModo
  persona_id?: number | null
  evento_id?: number | null
  resumen: {
    comprometido: number
    abonado: number
    pendiente: number
    ganancia?: number
  }
  opciones_integrantes: AbonoOption[]
  opciones_actividades: AbonoOption[]
  filas: AbonoFila[]
}

export interface AbonoReparto {
  ofrenda: number
  diezmo: number
  resto: number
  miembros: number
  club: number
  extras: number
}

export interface AbonoActividadDistribucion {
  evento_id: number
  evento_name: string
  ganancia_eclesiastica_id?: number | null
  reparto?: AbonoReparto | null
  ingreso: number
  ajuste_participantes?: number
  servicios: Array<{
    id: number
    nombre: string
    precio: number
    inversion: number
    cantidad_proyectada: number
  }>
  lineas: Array<{ id: number; nombre: string; qty: number }>
  abonos_por_producto: Record<string, number>
}

export type PresupuestoTipo = 'individual' | 'grupal'
export type PresupuestoBloqueKey = 'miembros' | 'acompanantes'
export type PresupuestoDestinatario = PresupuestoBloqueKey | 'ambos'

export interface PresupuestoEvento {
  id: number
  name: string
  starts_at?: string | null
  lugar?: string | null
  image_url?: string | null
  banner_url?: string | null
  tiene_presupuesto?: boolean
  presupuestos_count?: number
  miembros_count?: number
  acompanantes_count?: number
}

export interface PresupuestoResumen {
  id: number
  nombre: string
  activo: boolean
}

export interface PresupuestoItem {
  id?: number
  concepto: string
  tipo: PresupuestoTipo
  monto: number
  destinatario: PresupuestoDestinatario
  orden?: number
  monto_total: number
  por_persona: number | null
}

export interface PresupuestoBloque {
  items: PresupuestoItem[]
  total_por_persona: number
  total: number
}

export interface PresupuestoDetalle {
  evento: PresupuestoEvento
  presupuesto_id?: number | null
  nombre?: string | null
  activo?: boolean
  presupuestos?: PresupuestoResumen[]
  acompanantes_count: number
  acompanantes_inscritos: number
  miembros_count: number
  cantidades: Record<PresupuestoBloqueKey, number>
  bloques: Record<PresupuestoBloqueKey, PresupuestoBloque>
}

export interface FinanzasKpis {
  ingresos: number
  gastos: number
  disponible: number
  por_distribuir: number
  actividades: number
  conceptos_gasto: number
}

export interface FinanzasParte {
  key: string
  label: string
  amount: number
  percent: number
  tone: string
}

export interface FinanzasSerieMes {
  mes: string
  label: string
  ingresos: number
  gastos: number
}

export interface FinanzasCuenta {
  id: number
  nombre: string
  tipo: string
  saldo: number
}

export interface FinanzasMovimiento {
  id: number
  tipo: 'ingreso' | 'egreso' | string
  origen: string
  monto: number
  concepto: string
  cuenta_id: number
  cuenta_bancaria_id?: number | null
  cuenta_nombre?: string | null
  evento_id?: number | null
  evento_nombre?: string | null
  destino?: string | null
  persona_id?: number | null
  persona_nombre?: string | null
  occurred_at?: string | null
}

export interface FinanzasActividadPartes {
  participantes: number
  diezmo: number
  ofrenda: number
  club: number
  extras: number
  capital: number
}

export interface FinanzasActividad extends FinanzasActividadPartes {
  id: number
  nombre: string
  starts_at?: string | null
  image_url?: string | null
  abonado: number
  proyeccion: number
  planteado?: FinanzasActividadPartes
}

export interface FinanzasEventoParticipanteOption {
  id: number
  nombre: string
}

export interface FinanzasEventoOption {
  id: number
  nombre: string
  starts_at?: string | null
  capital?: number
  diezmo?: number
  ofrenda?: number
  capital_recogido?: number
  diezmo_recogido?: number
  ofrenda_recogido?: number
  participantes?: FinanzasEventoParticipanteOption[]
}

export interface FinanzasCuentaBancariaOption {
  id: number
  nombre: string
  banco?: string | null
  numero_cuenta?: string | null
  saldo?: number
}

export interface FinanzasResumen {
  desde: string
  hasta: string
  cuenta_bancaria_id?: number | null
  kpis: FinanzasKpis
  distribucion: FinanzasParte[]
  serie_mensual: FinanzasSerieMes[]
  cuentas: FinanzasCuenta[]
  movimientos: FinanzasMovimiento[]
  actividades: FinanzasActividad[]
  eventos: FinanzasEventoOption[]
  cuentas_bancarias: FinanzasCuentaBancariaOption[]
}
