import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { abonosApi } from '../api/abonos'
import { usersApi } from '../api/users'
import { resolveFileUrl } from '../api/baseUrl'
import { getApiErrorMessage } from '../api/client'
import type { AbonoFila, AbonoMovimiento, AbonosBoard, AbonosModo, AuthUser, EventSummary } from '../api/types'
import { AdminIcon } from '../admin/AdminIcon'
import {
  canAccessClubAbonos,
  clubAccessFromUser,
  isClubDirectorRole,
  MY_ABONOS_REGISTER_PERMISSION,
} from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import {
  AbonoPayForm,
  abonoPayPartidas,
  abonoPayTotal,
  emptyAbonoPayDraft,
  composeAbonoNota,
  parseAbonoNota,
  type AbonoPayDraft,
} from '../components/abonos/AbonoPayForm'
import {
  AbonoLibreForm,
  emptyAbonoLibreDraft,
  type AbonoLibreDraft,
} from '../components/abonos/AbonoLibreForm'
import {
  AbonoAmountControl,
  AbonoProofAttachButton,
  AbonoProofReview,
  AbonoShotButton,
  abonoEstadoLabel,
} from '../components/abonos/AbonoProofReview'
import { AbonoLibreReviewCard } from '../components/abonos/AbonoLibreReviewCard'
import { AbonoActividadDistribucion } from '../components/abonos/AbonoActividadDistribucion'
import { AbonoMoneyRow } from '../components/abonos/AbonoMoneyRow'
import { EventMemberJoin } from '../components/events/EventMemberJoin'
import { memberInitials } from '../components/attendance/AttendanceMarkList'
import { ServiceThumb } from '../components/services/ServiceVisual'
import { AppPanel } from '../theme/AppPanel'
import { AppTabs } from '../theme/AppTabs'
import { CreateDrawer } from '../theme/CreateDrawer'
import { formatDate } from '../theme/dates'
import { useNotice } from '../theme/NoticeProvider'
import '../theme/abonos.css'

const MOBILE_ABONOS = '(max-width: 900px)'

type PayFilter = 'pendientes' | 'todos'
type DealTab = 'abonar' | 'pagados' | 'libres'
type BoardTab = AbonosModo | 'libre'

type LibrePersonaGroup = {
  persona_id: number
  nombre: string
  foto_url?: string | null
  abonos: AbonoMovimiento[]
  total: number
}

function formatPrice(value: number | string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function emptyBoard(): AbonosBoard {
  return {
    modo: 'integrante',
    resumen: { comprometido: 0, abonado: 0, pendiente: 0 },
    opciones_integrantes: [],
    opciones_actividades: [],
    filas: [],
  }
}

function emptyDraft() {
  return emptyAbonoPayDraft()
}

function rowKey(row: AbonoFila, index: number): string {
  return `${row.persona_id ?? 'p'}-${row.evento_id ?? 'e'}-${index}`
}

function pickKey(row: AbonoFila): string {
  return `${row.persona_id ?? 'p'}-${row.evento_id ?? 'e'}`
}

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function samePersonName(rowName: string, candidate: string): boolean {
  const row = rowName.trim().toLowerCase()
  const name = candidate.trim().toLowerCase()
  if (!row || !name) return false
  return row === name || row.startsWith(`${name} `) || name.startsWith(`${row} `)
}

function groupAbonosByShot(abonos: AbonoMovimiento[]): AbonoMovimiento[][] {
  const groups = new Map<string, AbonoMovimiento[]>()
  abonos.forEach((abono) => {
    const shot = resolveFileUrl(abono.comprobante_url)
    const key = shot || `abono:${abono.id}`
    const current = groups.get(key)
    if (current) current.push(abono)
    else groups.set(key, [abono])
  })
  return [...groups.values()]
}

function eventFromAbonoRow(row: AbonoFila): EventSummary | null {
  if (!row.evento_id) return null
  return {
    id: row.evento_id,
    name: row.evento_name || 'Actividad',
    starts_at: row.starts_at,
    estado: row.evento_estado,
    banner_url: row.banner_url,
    image_url: row.image_url,
    cuenta_bancaria: row.cuenta_bancaria ?? null,
  }
}

function findSessionAbono(rows: AbonoFila[], user: AuthUser, personaId: number | null, fullName: string | null) {
  if (personaId) {
    const byId = rows.find((row) => row.persona_id === personaId)
    if (byId) return byId
  }
  const names = [fullName, user.name].filter((value): value is string => Boolean(value?.trim()))
  return rows.find((row) => names.some((name) => samePersonName(row.full_name ?? '', name))) ?? null
}


function DealStatusRow({
  row,
  title,
  photo,
  square = false,
  paid,
  canPay = false,
  onPay,
  onDetails,
}: {
  row: AbonoFila
  title: string
  photo?: string | null
  square?: boolean
  paid: boolean
  canPay?: boolean
  onPay?: () => void
  onDetails: () => void
}) {
  return (
    <article className={`abonos-status-row${paid ? ' is-ok' : ''}`}>
      <AbonosAvatar name={title || '?'} photo={photo} square={square} />
      <span className="abonos-deal__who">
        <strong>{title || 'Sin nombre'}</strong>
        <small>{row.starts_at ? formatDate(row.starts_at) : '—'}</small>
      </span>
      <span className="abonos-status-row__figures">
        <span className="abonos-status-row__money">
          <strong>{formatPrice(paid ? row.abonado : row.pendiente)}</strong>
          <small>{paid ? 'Pagado' : 'Pendiente'}</small>
        </span>
        <span className="abonos-status-row__money is-gain">
          <strong>{formatPrice(Number(row.ganancia) || 0)}</strong>
          <small>Ganancia real</small>
        </span>
      </span>
      <div className="abonos-deal__actions">
        {canPay ? (
          <button type="button" className="app-panel__btn--primary" onClick={onPay}>
            Abonar
          </button>
        ) : null}
        <button type="button" className="app-panel__btn--ghost" onClick={onDetails}>
          Ver detalles
        </button>
      </div>
    </article>
  )
}

function AbonosAvatar({
  name,
  photo,
  square = false,
}: {
  name: string
  photo?: string | null
  square?: boolean
}) {
  const src = resolveFileUrl(photo)
  return (
    <span className={`abonos-avatar${square ? ' is-square' : ''}`} aria-hidden="true">
      {src ? <img src={src} alt="" /> : memberInitials(name || '?')}
    </span>
  )
}

export function AbonosPage({ mine = false }: { mine?: boolean }) {
  const auth = useAuth()
  const ctx = auth.user?.contexto
  const access = clubAccessFromUser(auth.user, auth.can)
  const canEdit = canAccessClubAbonos(access) || auth.can('abonos.update')
  const canEditAbonoAmount = isClubDirectorRole(access.rolName, access.isSuper)
  const canDeleteAbonoAmount = canEditAbonoAmount
  const canSendProof = auth.can(MY_ABONOS_REGISTER_PERMISSION)
  const notices = useNotice()
  const [boardTab, setBoardTab] = useState<BoardTab>('integrante')
  const [modo, setModo] = useState<AbonosModo>('integrante')
  const [personaId, setPersonaId] = useState<number | null>(null)
  const [eventoId, setEventoId] = useState<number | null>(null)
  const [librePersonaId, setLibrePersonaId] = useState<number | null>(null)
  const [list, setList] = useState<AbonosBoard>(emptyBoard)
  const [detail, setDetail] = useState<AbonosBoard>(emptyBoard)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(mine)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PayFilter>('pendientes')
  const [detailsKey, setDetailsKey] = useState<string | null>(null)
  const [detailsTab, setDetailsTab] = useState<'servicios' | 'abonos' | 'reparto'>('servicios')
  const [dealTab, setDealTab] = useState<DealTab>('abonar')
  const [payKey, setPayKey] = useState<string | null>(null)
  const [libreOpen, setLibreOpen] = useState(false)
  const [draft, setDraft] = useState<AbonoPayDraft>(emptyDraft)
  const [libreDraft, setLibreDraft] = useState<AbonoLibreDraft>(emptyAbonoLibreDraft)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_ABONOS).matches : false,
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  const selected = modo === 'integrante' ? personaId : eventoId
  const listedRow = list.filas.find((row) =>
    modo === 'integrante' ? row.persona_id === personaId : row.evento_id === eventoId,
  )
  const selectedRow = listedRow
  const selectedName =
    modo === 'integrante' ? selectedRow?.full_name : selectedRow?.evento_name
  const liveDetailRows = detail.filas.filter((row) => (row.evento_estado || '').toLowerCase() !== 'cancelado')
  const pendingDeals = liveDetailRows.filter((row) => row.pendiente > 0)
  const paidDeals = liveDetailRows.filter((row) => row.pendiente <= 0)
  const pendingTotal = pendingDeals.reduce((sum, row) => sum + Number(row.pendiente || 0), 0)
  const paidTotal = paidDeals.reduce((sum, row) => sum + Number(row.abonado || 0), 0)
  const pendingHint =
    modo === 'integrante' ? 'Actividades con saldo pendiente' : 'Integrantes con saldo pendiente'
  const paidHint = modo === 'integrante' ? 'Actividades ya pagadas' : 'Integrantes que ya pagaron'
  const libresHint = 'Sin actividad · van a tu ganancia'

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return list.filas.filter((row) => {
      if ((row.evento_estado || '').toLowerCase() === 'cancelado') return false
      if (filter === 'pendientes' && row.pendiente <= 0) return false
      if (!needle) return true
      const haystack = `${row.full_name ?? ''} ${row.evento_name ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [filter, list.filas, query])

  const payRow = detail.filas.find((row) => pickKey(row) === payKey) ?? null
  const payEvent = mine && payRow ? eventFromAbonoRow(payRow) : null
  const payTitle = modo === 'integrante' ? payRow?.evento_name : payRow?.full_name
  const payPersonName = payRow?.full_name || selectedRow?.full_name
  const payPhoto = payRow?.foto_url || selectedRow?.foto_url
  const abonosLibres = (mine
    ? (selected ? detail.abonos_libres : list.abonos_libres)
    : list.abonos_libres) ?? []
  const libresTotal = abonosLibres.reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0)
  const libresAprobadosTotal = abonosLibres
    .filter((abono) => !abono.estado || abono.estado === 'aprobado')
    .reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0)
  const cuentaLibre = detail.cuenta_bancaria_libre ?? list.cuenta_bancaria_libre ?? null
  const libreGroups = useMemo(() => {
    const map = new Map<number, LibrePersonaGroup>()
    abonosLibres.forEach((abono) => {
      const id = Number(abono.persona_id) || 0
      if (id <= 0) return
      const current = map.get(id)
      if (current) {
        current.abonos.push(abono)
        current.total += Number(abono.monto) || 0
        return
      }
      map.set(id, {
        persona_id: id,
        nombre: abono.persona_nombre || 'Participante',
        foto_url: abono.foto_url,
        abonos: [abono],
        total: Number(abono.monto) || 0,
      })
    })
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [abonosLibres])
  const filteredLibreGroups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return libreGroups
    return libreGroups.filter((group) => group.nombre.toLowerCase().includes(needle))
  }, [libreGroups, query])
  const libreSelected = libreGroups.find((group) => group.persona_id === librePersonaId) ?? null
  const libreSelectedAbonos = libreSelected?.abonos ?? []

  useEffect(() => {
    if (librePersonaId == null) return
    if (libreGroups.some((group) => group.persona_id === librePersonaId)) return
    setLibrePersonaId(null)
    if (isMobile) setDrawerOpen(false)
  }, [isMobile, libreGroups, librePersonaId])

  const payProducts = (payRow?.pedidos ?? []).map((pedido) => {
    const productoId = Number(pedido.producto_servicio_id ?? pedido.id)
    const abonado = (payRow?.abonos ?? []).reduce((sum, abono) => {
      if (Number(abono.producto_servicio_id) !== productoId) return sum
      if (abono.estado && abono.estado !== 'aprobado') return sum
      return sum + (Number(abono.monto) || 0)
    }, 0)
    return {
      id: productoId,
      nombre: pedido.nombre,
      pendiente: Math.max(0, Number(pedido.total) - abonado),
    }
  })
  const detailsRow = detail.filas.find((row) => pickKey(row) === detailsKey) ?? null
  const detailsTitle = modo === 'integrante' ? detailsRow?.evento_name : detailsRow?.full_name
  const detailsPhoto = detailsRow?.foto_url || selectedRow?.foto_url
  const drawerPlacement = isMobile ? 'bottom' : 'end'

  useEffect(() => {
    if (mine) return undefined
    let cancelled = false
    setLoadingList(true)
    abonosApi
      .board({ modo })
      .then((next) => {
        if (cancelled) return
        setList(next)
        setPersonaId(null)
        setEventoId(null)
        setDrawerOpen(false)
        setDetailsKey(null)
        setPayKey(null)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar los abonos'))
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [mine, modo, notices])

  useEffect(() => {
    const media = window.matchMedia(MOBILE_ABONOS)
    const sync = () => {
      setIsMobile(media.matches)
      if (!media.matches) setDrawerOpen(false)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!mine || !auth.user?.id) return undefined
    let cancelled = false
    setLoadingList(true)
    setLoadingDetail(true)
    const user = auth.user
    Promise.all([
      abonosApi.board({ modo: 'integrante' }),
      usersApi.show(user.id).catch(() => null),
    ])
      .then(([board, profile]) => {
        if (cancelled) return
        setList(board)
        const row = findSessionAbono(
          board.filas,
          user,
          profile?.persona?.id ?? profile?.persona_id ?? user.persona_id ?? null,
          profile?.persona?.full_name ?? null,
        )
        setPersonaId(row?.persona_id ?? profile?.persona?.id ?? profile?.persona_id ?? user.persona_id ?? null)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar tus abonos'))
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [auth.user, mine, notices])

  useEffect(() => {
    if (!selected) {
      setDetail(emptyBoard())
      setDetailsKey(null)
      setPayKey(null)
      if (mine) setLoadingDetail(false)
      return undefined
    }
    let cancelled = false
    setLoadingDetail(true)
    abonosApi
      .board({
        modo,
        personaId: modo === 'integrante' ? personaId : null,
        eventoId: modo === 'actividad' ? eventoId : null,
      })
      .then((next) => {
        if (cancelled) return
        setDetail(next)
        setDetailsKey(null)
        setPayKey(null)
        setDraft(emptyDraft())
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar el detalle'))
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventoId, mine, modo, notices, personaId, selected])

  useEffect(() => {
    setDealTab('abonar')
  }, [modo, selected])

  function changeBoardTab(next: BoardTab) {
    if (next === boardTab) return
    setBoardTab(next)
    setPersonaId(null)
    setEventoId(null)
    setLibrePersonaId(null)
    setQuery('')
    setDetailsKey(null)
    setPayKey(null)
    setDraft(emptyDraft())
    setDrawerOpen(false)
    if (next === 'integrante' || next === 'actividad') {
      setModo(next)
    }
  }

  function pickRow(row: AbonoFila) {
    if (modo === 'integrante' && row.persona_id) setPersonaId(row.persona_id)
    if (modo === 'actividad' && row.evento_id) setEventoId(row.evento_id)
    if (isMobile) setDrawerOpen(true)
  }

  function pickLibrePersona(group: LibrePersonaGroup) {
    setLibrePersonaId(group.persona_id)
    if (isMobile) setDrawerOpen(true)
  }

  function closeDetail() {
    setDrawerOpen(false)
    closePay()
    closeDetails()
    if (isMobile && !mine) {
      setPersonaId(null)
      setEventoId(null)
      setLibrePersonaId(null)
    }
  }

  function openDetails(row: AbonoFila) {
    setDetailsKey(pickKey(row))
    setDetailsTab('servicios')
  }

  function closeDetails() {
    setDetailsKey(null)
    setDetailsTab('servicios')
  }

  function startPay(row: AbonoFila) {
    if (!canEdit || row.pendiente <= 0) return
    setPayKey(pickKey(row))
    setDraft({
      ...emptyDraft(),
      monto: String(Math.round(row.pendiente)),
    })
  }

  function closePay() {
    setPayKey(null)
    setDraft(emptyDraft())
  }

  function openLibre() {
    if (!canSendProof) return
    setLibreDraft(emptyAbonoLibreDraft())
    setLibreOpen(true)
  }

  function closeLibre() {
    setLibreOpen(false)
    setLibreDraft(emptyAbonoLibreDraft())
  }

  async function submitLibre(event?: FormEvent) {
    event?.preventDefault()
    if (!canSendProof) {
      notices.error('No puedes enviar un abono libre.')
      return
    }
    const monto = Math.round(Number(libreDraft.monto) || 0)
    if (monto <= 0) {
      notices.warning('Escribe un monto mayor a cero.')
      return
    }
    if (!libreDraft.comprobante) {
      notices.warning('Adjunta el pantallazo del comprobante.')
      return
    }
    setSaving(true)
    try {
      const next = await abonosApi.submitLibre(monto, libreDraft.comprobante, libreDraft.detalle)
      if (mine) {
        await reloadMine()
      } else {
        await refreshAbonoBoards()
      }
      if (next.abonos) {
        setDetail((current) => ({ ...current, abonos_libres: next.abonos }))
      }
      closeLibre()
      notices.success('Abono libre enviado. Queda pendiente hasta que la directiva lo apruebe.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo enviar el abono libre'))
    } finally {
      setSaving(false)
    }
  }

  async function reviewLibre(
    abono: AbonoMovimiento,
    estado: 'aprobado' | 'rechazado',
    monto?: number,
  ) {
    if (!canEdit) return
    if (estado === 'aprobado' && (!monto || monto <= 0)) {
      notices.warning('Escribe el valor que se ve en el pantallazo.')
      return
    }
    setSaving(true)
    try {
      await abonosApi.review(abono.id, { estado, monto })
      if (mine) await reloadMine()
      else await refreshAbonoBoards()
      notices.success(estado === 'aprobado' ? 'Abono libre aprobado.' : 'Abono libre rechazado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo revisar el abono libre'))
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function reloadMine() {
    const nextDetail = await abonosApi.board({
      modo: 'integrante',
      personaId,
    })
    setDetail(nextDetail)
    setList(await abonosApi.board({ modo: 'integrante' }))
  }

  async function submitAbono(event?: FormEvent) {
    event?.preventDefault()
    if (!canEdit) {
      notices.error('No puedes registrar abonos.')
      return
    }
    if (!payRow?.persona_id || !payRow.evento_id) {
      notices.error('No se encontró el compromiso para abonar.')
      return
    }
    const partidas = abonoPayPartidas(draft, payProducts)
    const total = abonoPayTotal(draft, payProducts)
    if (payProducts.length > 0 && partidas.length === 0) {
      notices.warning('Indica cuánto abonas de cada producto.')
      return
    }
    if (!draft.metodo) {
      notices.warning('Elige un método de pago.')
      return
    }
    if (total <= 0) {
      notices.warning('Escribe un monto mayor a cero.')
      return
    }
    setSaving(true)
    try {
      const next = await abonosApi.store({
        evento_id: payRow.evento_id,
        persona_id: payRow.persona_id,
        monto: payProducts.length ? undefined : total,
        nota: composeAbonoNota(draft),
        modo,
        partidas: payProducts.length ? partidas : undefined,
        comprobante: draft.comprobante,
      })
      setDetail(next)
      if (!mine) {
        const listed = await abonosApi.board({ modo })
        setList(listed)
      }
      closePay()
      setDraft(emptyDraft())
      notices.success('Abono registrado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo registrar el abono'))
    } finally {
      setSaving(false)
    }
  }

  async function refreshAbonoBoards() {
    const nextDetail = await abonosApi.board({
      modo,
      personaId: modo === 'integrante' ? personaId : null,
      eventoId: modo === 'actividad' ? eventoId : null,
    })
    setDetail(nextDetail)
    if (!mine) setList(await abonosApi.board({ modo }))
  }

  async function updateAbonoAmount(abono: { id: number }, monto: number) {
    if (!canEditAbonoAmount) return
    if (!Number.isFinite(monto) || monto <= 0) {
      notices.warning('Escribe un valor mayor a cero.')
      return
    }
    setSaving(true)
    try {
      await abonosApi.updateMonto(abono.id, monto)
      await refreshAbonoBoards()
      notices.success('Valor del abono actualizado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo cambiar el valor del abono'))
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function attachAbonoProof(abonos: { id: number }[], file: File) {
    if (!canEdit || !abonos.length) return
    setSaving(true)
    try {
      await abonosApi.attachComprobante(
        abonos[0].id,
        file,
        abonos.map((abono) => abono.id),
      )
      await refreshAbonoBoards()
      notices.success('Comprobante adjuntado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo adjuntar el comprobante'))
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function deleteAbonoAmount(abono: { id: number }) {
    if (!canDeleteAbonoAmount) return
    setSaving(true)
    try {
      await abonosApi.review(abono.id, { estado: 'eliminado' })
      await refreshAbonoBoards()
      notices.success('Abono eliminado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo eliminar el abono'))
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function reviewAbono(
    abono: { id: number },
    estado: 'aprobado' | 'rechazado',
    monto?: number,
  ) {
    if (!canEdit) return
    if (estado === 'aprobado' && (!monto || monto <= 0)) {
      notices.warning('Escribe el valor que se ve en el pantallazo.')
      return
    }
    setSaving(true)
    try {
      await abonosApi.review(abono.id, { estado, monto })
      const nextDetail = await abonosApi.board({
        modo,
        personaId: modo === 'integrante' ? personaId : null,
        eventoId: modo === 'actividad' ? eventoId : null,
      })
      setDetail(nextDetail)
      if (!mine) {
        setList(await abonosApi.board({ modo }))
      }
      notices.success(estado === 'aprobado' ? 'Abono aprobado.' : 'Abono rechazado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo revisar el abono'))
      throw err
    } finally {
      setSaving(false)
    }
  }

  const listNoun = modo === 'integrante' ? 'integrantes' : 'actividades'
  const pendingNoun = modo === 'integrante' ? ['actividad pendiente', 'actividades pendientes'] : ['integrante pendiente', 'integrantes pendientes']
  const dealTabItems = [
    {
      id: 'abonar' as const,
      label: (
        <>
          <span className="abonos-status-board__icon" aria-hidden="true">
            <AdminIcon name="hourglass" />
          </span>
          <span>
            <strong>Por abonar ({pendingDeals.length})</strong>
            <small>{pendingHint}</small>
          </span>
          {!mine || !isMobile ? (
            <span className="abonos-status-board__total">
              <strong>{formatPrice(pendingTotal)}</strong>
              <small>Total pendiente</small>
            </span>
          ) : null}
        </>
      ),
    },
    {
      id: 'pagados' as const,
      paid: true,
      label: (
        <>
          <span className="abonos-status-board__icon" aria-hidden="true">
            <AdminIcon name="check" />
          </span>
          <span>
            <strong>Pagados ({paidDeals.length})</strong>
            <small>{paidHint}</small>
          </span>
          {!mine || !isMobile ? (
            <span className="abonos-status-board__total">
              <strong>{formatPrice(paidTotal)}</strong>
              <small>Total pagado</small>
            </span>
          ) : null}
        </>
      ),
    },
    ...(mine
      ? [
          {
            id: 'libres' as const,
            label: (
              <>
                <span className="abonos-status-board__icon" aria-hidden="true">
                  <AdminIcon name="wallet" />
                </span>
                <span>
                  <strong>Abonos libres ({abonosLibres.length})</strong>
                  <small>{libresHint}</small>
                </span>
                {!isMobile ? (
                  <span className="abonos-status-board__total">
                    <strong>{formatPrice(libresAprobadosTotal || libresTotal)}</strong>
                    <small>{libresAprobadosTotal > 0 ? 'Total abonado' : 'Total enviado'}</small>
                  </span>
                ) : null}
              </>
            ),
          },
        ]
      : []),
  ]
  const mineLibresList =
    abonosLibres.length > 0 ? (
      <ul className="abonos-history">
        {abonosLibres.map((abono) => (
          <li key={abono.id}>
            <span className="abonos-history__who">
              <strong>{abono.producto_nombre || 'Abono libre'}</strong>
              <small>
                {abono.nota ? `${abono.nota} · ` : ''}
                {abono.created_at ? formatDate(abono.created_at) : '—'}
              </small>
            </span>
            <span className="abonos-history__end">
              <AbonoShotButton abono={abono} />
              <span className="abonos-history__amounts">
                <strong>{formatPrice(abono.monto)}</strong>
                <small>{abonoEstadoLabel(abono) || 'Aprobado'}</small>
              </span>
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="app-panel__muted">Todavía no enviaste abonos libres. Usa + para registrar uno.</p>
    )

  const dealList =
    dealTab === 'libres' ? (
      <div className="abonos-status-board is-on abonos-libres-board">{mineLibresList}</div>
    ) : (
      <div className="abonos-status-board is-on">
        {dealTab === 'abonar' ? (
          pendingDeals.length ? (
            pendingDeals.map((row, index) => (
              <DealStatusRow
                key={rowKey(row, index)}
                row={row}
                title={(modo === 'integrante' ? row.evento_name : row.full_name) || 'Sin nombre'}
                photo={modo === 'integrante' ? row.image_url : row.foto_url}
                square={modo === 'integrante'}
                paid={false}
                canPay={mine ? canSendProof && row.pendiente > 0 : canEdit}
                onPay={() => (mine ? setPayKey(pickKey(row)) : startPay(row))}
                onDetails={() => openDetails(row)}
              />
            ))
          ) : (
            <p className="app-panel__muted">No hay compromisos por abonar.</p>
          )
        ) : paidDeals.length ? (
          paidDeals.map((row, index) => (
            <DealStatusRow
              key={rowKey(row, index)}
              row={row}
              title={(modo === 'integrante' ? row.evento_name : row.full_name) || 'Sin nombre'}
              photo={modo === 'integrante' ? row.image_url : row.foto_url}
              square={modo === 'integrante'}
              paid
              onDetails={() => openDetails(row)}
            />
          ))
        ) : (
          <p className="app-panel__muted">Todavía no hay compromisos pagados.</p>
        )}
      </div>
    )

  const libreDetailContent = (
    <>
      {!libreSelected ? (
        <p className="app-panel__hint">Elige un integrante para revisar sus abonos libres pendientes.</p>
      ) : (
        <>
          <header className="abonos-detail__head">
            <AbonosAvatar name={libreSelected.nombre} photo={libreSelected.foto_url} />
            <div>
              <h3>{libreSelected.nombre}</h3>
              <p>
                {countLabel(libreSelected.abonos.length, 'abono libre pendiente', 'abonos libres pendientes')}
              </p>
            </div>
            <p className="abonos-detail__total">
              <strong>{formatPrice(libreSelected.total)}</strong>
              <span>Total pendiente</span>
            </p>
          </header>
          <section className="abonos-libres">
            <ul className="abonos-libres__cards">
              {libreSelectedAbonos.map((abono) => (
                <AbonoLibreReviewCard
                  key={abono.id}
                  abono={abono}
                  canReview={canEdit}
                  formatDate={formatDate}
                  formatPrice={formatPrice}
                  onReview={reviewLibre}
                />
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  )

  const detailContent = boardTab === 'libre' && !mine ? (
    libreDetailContent
  ) : (
    <>
      {!selected && !mine ? (
        <p className="app-panel__hint">Elige un integrante o una actividad para registrar el recaudo.</p>
      ) : null}
      {mine && loadingList ? <p className="app-panel__muted">Cargando tus abonos…</p> : null}
      {mine && !loadingList && !selected ? (
        <p className="app-panel__hint">No encontramos abonos de tu usuario en este club.</p>
      ) : null}

      {selected && selectedRow && !mine ? (
        <header className="abonos-detail__head">
          <AbonosAvatar
            name={selectedName || '?'}
            photo={modo === 'integrante' ? selectedRow.foto_url : selectedRow.image_url}
            square={modo === 'actividad'}
          />
          <div>
            <h3>{selectedName || 'Sin nombre'}</h3>
            <p>
              {ctx?.organizacion_nombre ? `${ctx.organizacion_nombre} · ` : ''}
              {countLabel(selectedRow.pendientes ?? 0, pendingNoun[0], pendingNoun[1])}
            </p>
          </div>
          <p className="abonos-detail__total">
            <strong>{formatPrice(selectedRow.pendiente)}</strong>
            <span>Total pendiente</span>
          </p>
        </header>
      ) : null}

      {loadingDetail ? <p className="app-panel__muted">Cargando compromisos…</p> : null}

      {mine && !loadingDetail && (selected || abonosLibres.length > 0) ? (
        <section className="abonos-deals">
          <AppTabs
            label="Estado de los compromisos"
            value={dealTab}
            onChange={setDealTab}
            tabs={dealTabItems}
          >
            {isMobile ? (
              <p
                className={`abonos-mine-totals${
                  dealTab === 'pagados' ? ' is-paid' : dealTab === 'libres' ? ' is-libre' : ''
                }`}
              >
                <strong>
                  {formatPrice(
                    dealTab === 'abonar'
                      ? pendingTotal
                      : dealTab === 'pagados'
                        ? paidTotal
                        : libresAprobadosTotal || libresTotal,
                  )}
                </strong>
                <span>
                  {dealTab === 'abonar'
                    ? 'Total pendiente'
                    : dealTab === 'pagados'
                      ? 'Total pagado'
                      : libresAprobadosTotal > 0
                        ? 'Total abonado'
                        : 'Total enviado'}
                </span>
              </p>
            ) : null}
            {dealList}
          </AppTabs>
        </section>
      ) : null}

      {!mine && selected && !loadingDetail && detail.filas.length ? (
        <section className="abonos-deals">
          <AppTabs
            label="Estado de los compromisos"
            value={dealTab}
            onChange={setDealTab}
            tabs={dealTabItems}
          >
            {dealList}
          </AppTabs>
        </section>
      ) : null}
    </>
  )

  return (
    <section className={`admin-page admin-page--abonos${mine ? ' admin-page--my-abonos' : ''}`}>
      {mine && canSendProof ? (
        <button
          type="button"
          className={`admin-fab${libreOpen ? ' is-open' : ''}`}
          aria-label={libreOpen ? 'Cerrar abono libre' : 'Abono libre'}
          title={libreOpen ? 'Cerrar' : 'Abono libre'}
          onClick={() => (libreOpen ? closeLibre() : openLibre())}
        >
          <span aria-hidden="true">+</span>
        </button>
      ) : null}

      {!isMobile ? (
        <AppPanel shine={false} className="abonos-workspace">
          <p className="app-panel__kicker">Recaudo</p>
          <h2 className="app-panel__title">{mine ? 'Mis abonos' : 'Registrar abono'}</h2>
          <p className="app-panel__subtitle">
            {mine
              ? 'Estas son tus actividades económicas y lo que falta por abonar. Usa + para un abono libre.'
              : 'Busca por integrante, actividad o abonos libres. Luego registra o aprueba exactamente lo que corresponde.'}
          </p>
        </AppPanel>
      ) : null}

      {mine && isMobile ? (
        <div className="abonos-detail abonos-detail--bare abonos-mine-tabs">
          {detailContent}
        </div>
      ) : null}

      {mine && !isMobile ? (
        <div className="abonos-detail abonos-detail--bare">{detailContent}</div>
      ) : null}

      {!mine ? (
      <div className="abonos-workspace__grid">
        {(() => {
          const isLibreTab = boardTab === 'libre'
          const boardBody = (
            <AppTabs
              label="Vista de abonos"
              value={boardTab}
              onChange={changeBoardTab}
              tabs={[
                { id: 'integrante', label: <><AdminIcon name="user" /> Por integrante</> },
                { id: 'actividad', label: <><AdminIcon name="calendar" /> Por actividad</> },
                { id: 'libre', label: <><AdminIcon name="wallet" /> Abonos libres</> },
              ]}
            >
              <label className="abonos-search">
                Buscar
                <span className="app-panel__field">
                  <AdminIcon name="users" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      isLibreTab
                        ? 'Buscar integrante por nombre…'
                        : modo === 'integrante'
                          ? 'Buscar integrante por nombre…'
                          : 'Buscar actividad por nombre…'
                    }
                  />
                  {query ? (
                    <button type="button" className="abonos-search__clear" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
                      ×
                    </button>
                  ) : null}
                </span>
              </label>

              {isLibreTab ? (
                <>
                  <div className="abonos-board__meta">
                    <p>
                      Se encontraron {filteredLibreGroups.length}{' '}
                      {filteredLibreGroups.length === 1 ? 'integrante' : 'integrantes'}
                    </p>
                  </div>

                  {loadingList ? <p className="app-panel__muted">Cargando abonos libres…</p> : null}
                  {!loadingList && filteredLibreGroups.length === 0 ? (
                    <p className="app-panel__hint">
                      {libreGroups.length === 0
                        ? 'No hay abonos libres pendientes de aprobación.'
                        : 'Nadie coincide con esa búsqueda.'}
                    </p>
                  ) : null}

                  <div className="abonos-picks">
                    {filteredLibreGroups.map((group) => {
                      const on = group.persona_id === librePersonaId
                      return (
                        <button
                          key={group.persona_id}
                          type="button"
                          className={`abonos-pick${on ? ' is-on' : ''}`}
                          onClick={() => pickLibrePersona(group)}
                        >
                          <AbonosAvatar name={group.nombre} photo={group.foto_url} />
                          <span className="abonos-pick__who">
                            <strong>{group.nombre}</strong>
                            <small>
                              {countLabel(group.abonos.length, 'abono libre pendiente', 'abonos libres pendientes')}
                            </small>
                          </span>
                          <span className="abonos-pick__money">
                            <strong>{formatPrice(group.total)}</strong>
                            <small>Total pendiente</small>
                          </span>
                          <AdminIcon name="chevronRight" />
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="abonos-board__meta">
                    <p>
                      Se encontraron {filtered.length} {listNoun}
                    </p>
                    <label>
                      <span className="sr-only">Filtro</span>
                      <select value={filter} onChange={(event) => setFilter(event.target.value as PayFilter)}>
                        <option value="pendientes">Pendientes</option>
                        <option value="todos">Todos</option>
                      </select>
                    </label>
                  </div>

                  {loadingList ? <p className="app-panel__muted">Cargando abonos…</p> : null}
                  {!loadingList && filtered.length === 0 ? (
                    <p className="app-panel__hint">
                      {list.filas.length === 0
                        ? 'Todavía no hay participantes con cantidades en actividades económicas.'
                        : 'Nadie coincide con esa búsqueda o filtro.'}
                    </p>
                  ) : null}

                  <div className="abonos-picks">
                    {filtered.map((row, index) => {
                      const title = modo === 'integrante' ? row.full_name : row.evento_name
                      const pending = row.pendientes ?? (row.pendiente > 0 ? 1 : 0)
                      const on = modo === 'integrante' ? row.persona_id === personaId : row.evento_id === eventoId
                      return (
                        <button
                          key={rowKey(row, index)}
                          type="button"
                          className={`abonos-pick${on ? ' is-on' : ''}`}
                          onClick={() => pickRow(row)}
                        >
                          <AbonosAvatar
                            name={title || '?'}
                            photo={modo === 'integrante' ? row.foto_url : row.image_url}
                            square={modo === 'actividad'}
                          />
                          <span className="abonos-pick__who">
                            <strong>{title || 'Sin nombre'}</strong>
                            <small>{countLabel(pending, pendingNoun[0], pendingNoun[1])}</small>
                          </span>
                          <span className="abonos-pick__money">
                            <strong>{formatPrice(row.pendiente)}</strong>
                            <small>Total pendiente</small>
                          </span>
                          <AdminIcon name="chevronRight" />
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </AppTabs>
          )

          return <div className="abonos-board abonos-board--bare">{boardBody}</div>
        })()}

        {!isMobile ? (
          <AppPanel shine={false} className="abonos-detail">
            {detailContent}
          </AppPanel>
        ) : null}
      </div>
      ) : null}

      {!mine && isMobile ? (
        <CreateDrawer
          open={drawerOpen && (boardTab === 'libre' ? Boolean(libreSelected) : Boolean(selected))}
          title={
            boardTab === 'libre'
              ? libreSelected?.nombre || 'Abonos libres'
              : selectedName || 'Registrar abono'
          }
          subtitle={boardTab === 'libre' ? 'Revisión' : 'Recaudo'}
          placement="bottom"
          onClose={closeDetail}
        >
          <div className="abonos-detail">{detailContent}</div>
        </CreateDrawer>
      ) : null}

      <CreateDrawer
        open={Boolean(detailsRow)}
        stacked
        size={detailsTab === 'reparto' ? 'default' : 'half'}
        placement={drawerPlacement}
        title={detailsTitle || 'Detalle'}
        subtitle="Pedidos y abonos"
        cover={resolveFileUrl(detailsRow?.banner_url)}
        avatar={resolveFileUrl(detailsPhoto)}
        avatarFallback={memberInitials(detailsRow?.full_name || selectedRow?.full_name || detailsTitle || 'AB')}
        onClose={closeDetails}
      >
        {detailsRow ? (
          <div className="abonos-detail">
            <AbonoMoneyRow
              comprometido={detailsRow.comprometido}
              abonado={detailsRow.abonado}
              pendiente={detailsRow.pendiente}
            />
            <AppTabs
              label="Detalle del compromiso"
              value={detailsTab}
              onChange={setDetailsTab}
              tabs={[
                { id: 'servicios', label: <><AdminIcon name="box" /> Servicios</> },
                { id: 'abonos', label: <><AdminIcon name="wallet" /> Abonos</> },
                { id: 'reparto', label: <><AdminIcon name="pie" /> Reparto</> },
              ]}
            >
            {detailsTab === 'servicios' && detailsRow.pedidos?.length ? (
              <ul className="abonos-pedidos">
                {detailsRow.pedidos.map((pedido) => (
                  <li key={pedido.venta_id ?? pedido.producto_servicio_id ?? pedido.id}>
                    <span className="abonos-pedidos__name">
                      <ServiceThumb item={pedido} />
                      {pedido.nombre}
                    </span>
                    <span className="abonos-pedidos__qty">{pedido.cantidad} uds</span>
                    <strong>{formatPrice(pedido.total)}</strong>
                  </li>
                ))}
              </ul>
            ) : null}
            {detailsTab === 'servicios' && !detailsRow.pedidos?.length ? (
              <p className="app-panel__muted">No hay pedidos registrados en este compromiso.</p>
            ) : null}
            {detailsTab === 'abonos' && detailsRow.abonos?.length ? (
              <ul className="abonos-history">
                {groupAbonosByShot(detailsRow.abonos).map((group) => {
                  const lead = group[0]
                  const nota = parseAbonoNota(lead.nota)
                  const pending = group.filter((abono) => abono.estado === 'pendiente')
                  const products = group.map((abono) => abono.producto_nombre).filter(Boolean).join(' · ')
                  const total = group.reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0)
                  const shot = Boolean(resolveFileUrl(lead.comprobante_url))
                  const canAttachShot =
                    canEdit && !shot && group.some((abono) => abono.estado !== 'eliminado')
                  return (
                    <li key={group.map((abono) => abono.id).join('-')}>
                      <span className="abonos-history__who">
                        <AdminIcon name="wallet" />
                        <span>
                          <strong>{lead.created_at ? formatDate(lead.created_at) : nota.fecha || 'Abono'}</strong>
                          {products ? <small>{products}</small> : null}
                          {nota.metodo ? <small>{nota.metodo}</small> : null}
                          {nota.texto ? <small>{nota.texto}</small> : null}
                          {group.length > 1 ? <small>{group.length} productos · {formatPrice(total)}</small> : null}
                        </span>
                      </span>
                      <span className="abonos-history__end">
                        {shot ? <AbonoShotButton abono={lead} /> : null}
                        {canAttachShot ? (
                          <AbonoProofAttachButton
                            onAttach={async (file) => {
                              await attachAbonoProof(group, file)
                            }}
                          />
                        ) : null}
                        {pending.length ? (
                          <strong>{pending.length > 1 ? `Pendiente · ${pending.length}` : abonoEstadoLabel(pending[0])}</strong>
                        ) : group.every((abono) => abono.estado === 'eliminado') ? (
                          <strong>Eliminado</strong>
                        ) : group.every((abono) => abono.estado === 'rechazado') ? (
                          <strong>Rechazado</strong>
                        ) : group.length === 1 ? (
                          <AbonoAmountControl
                            abono={group[0]}
                            canEdit={canEditAbonoAmount}
                            canDelete={canDeleteAbonoAmount}
                            onSave={updateAbonoAmount}
                            onDelete={deleteAbonoAmount}
                          />
                        ) : (
                          <span className="abonos-history__amounts">
                            {group.map((abono) => (
                              <AbonoAmountControl
                                key={abono.id}
                                abono={abono}
                                canEdit={canEditAbonoAmount}
                                canDelete={canDeleteAbonoAmount}
                                onSave={updateAbonoAmount}
                                onDelete={deleteAbonoAmount}
                              />
                            ))}
                          </span>
                        )}
                      </span>
                      <AbonoProofReview
                        abonos={group}
                        canReview={canEdit}
                        hideShot
                        onReview={reviewAbono}
                      />
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {detailsTab === 'abonos' && !detailsRow.abonos?.length ? (
              <p className="app-panel__muted">Todavía no hay abonos en este compromiso.</p>
            ) : null}
            {detailsTab === 'reparto' && detailsRow.evento_id ? (
              <AbonoActividadDistribucion
                eventoId={detailsRow.evento_id}
                personaId={detailsRow.persona_id}
              />
            ) : null}
            {detailsTab === 'reparto' && !detailsRow.evento_id ? (
              <p className="app-panel__muted">No se encontró la actividad de este compromiso.</p>
            ) : null}
            </AppTabs>
          </div>
        ) : null}
      </CreateDrawer>

      {payEvent ? (
        <EventMemberJoin
          event={payEvent}
          onClose={() => {
            closePay()
            void reloadMine().catch(() => undefined)
          }}
          onChanged={() => {
            void reloadMine().catch(() => undefined)
          }}
        />
      ) : null}

      <CreateDrawer
        open={!mine && Boolean(payRow)}
        stacked
        size="half"
        placement={drawerPlacement}
        title={payTitle || 'Registrar abono'}
        subtitle="Recaudo"
        cover={resolveFileUrl(payRow?.banner_url)}
        avatar={resolveFileUrl(payPhoto)}
        avatarFallback={memberInitials(payPersonName || payTitle || 'AB')}
        onClose={closePay}
        footer={
          <>
            <button type="button" className="app-panel__btn--ghost" onClick={closePay}>
              Cancelar
            </button>
            <button
              type="button"
              className="app-panel__btn--primary"
              disabled={
                saving ||
                !payRow ||
                payRow.pendiente <= 0 ||
                !draft.metodo ||
                abonoPayTotal(draft, payProducts) <= 0
              }
              onClick={() => void submitAbono()}
            >
              <AdminIcon name="wallet" />
              Registrar abono
            </button>
          </>
        }
      >
        {payRow && !mine ? (
          <div className="abonos-detail">
            <AbonoMoneyRow
              comprometido={payRow.comprometido}
              abonado={payRow.abonado}
              pendiente={payRow.pendiente}
            />
            <AbonoPayForm
              draft={draft}
              pendiente={payRow.pendiente}
              products={payProducts}
              cuenta={payRow.cuenta_bancaria}
              saving={saving}
              showSubmit={false}
              onChange={setDraft}
              onSubmit={(event) => void submitAbono(event)}
            />
          </div>
        ) : null}
      </CreateDrawer>

      <CreateDrawer
        open={mine && libreOpen}
        stacked
        size="half"
        placement={drawerPlacement}
        title="Abono libre"
        subtitle="Ingreso directo a tu ganancia"
        onClose={closeLibre}
        footer={
          <>
            <button type="button" className="app-panel__btn--ghost" onClick={closeLibre}>
              Cancelar
            </button>
            <button
              type="button"
              className="app-panel__btn--primary"
              disabled={
                saving ||
                Math.round(Number(libreDraft.monto) || 0) <= 0 ||
                !libreDraft.comprobante
              }
              onClick={() => void submitLibre()}
            >
              <AdminIcon name="wallet" />
              Enviar abono libre
            </button>
          </>
        }
      >
        <div className="abonos-detail">
          <AbonoLibreForm
            draft={libreDraft}
            cuenta={cuentaLibre}
            saving={saving}
            showSubmit={false}
            onChange={setLibreDraft}
            onSubmit={(event) => void submitLibre(event)}
          />
        </div>
      </CreateDrawer>
    </section>
  )
}
