import { useEffect, useMemo, useState } from 'react'
import type { AbonoMovimiento, EventParticipant, EventParticipantService } from '../../api/types'
import { resolveFileUrl } from '../../api/baseUrl'
import { AdminIcon } from '../../admin/AdminIcon'
import { AppPanel } from '../../theme/AppPanel'
import { formatDate } from '../../theme/dates'
import { ImagePreviewDialog } from '../../theme/ImagePreviewDialog'
import { memberInitials } from '../attendance/AttendanceMarkList'
import {
  AbonoAmountControl,
  AbonoProofAttachButton,
  AbonoProofReview,
  AbonoShotButton,
  abonoEstadoLabel,
} from '../abonos/AbonoProofReview'
import { ServiceThumb } from '../services/ServiceVisual'
import { ProgressBar, SummaryDonut, SummaryKpi, summaryPercent } from './SummaryCards'
import '../../theme/attendance-mark.css'

type BulkParticipa = boolean | ''
type ParticipantSort = 'nombre' | 'cantidad_desc' | 'cantidad_asc' | 'participan' | 'no_participan'

const SORT_OPTIONS: { value: ParticipantSort; label: string }[] = [
  { value: 'nombre', label: 'Nombre' },
  { value: 'cantidad_desc', label: 'Más cantidades' },
  { value: 'cantidad_asc', label: 'Menos cantidades' },
  { value: 'participan', label: 'Participan primero' },
  { value: 'no_participan', label: 'No participan primero' },
]

const BULK_COPY: Record<'yes' | 'no' | 'clear', { title: string; apply: string }> = {
  yes: { title: 'Marcar que todos participan', apply: 'participan' },
  no: { title: 'Marcar que nadie participa', apply: 'no participan' },
  clear: { title: 'Limpiar participación', apply: 'sin marcar' },
}

function bulkKey(value: BulkParticipa): 'yes' | 'no' | 'clear' {
  if (value === true) return 'yes'
  if (value === false) return 'no'
  return 'clear'
}

function rowHasData(row: EventParticipant, draft: ParticipantDraft): boolean {
  const current = draft[row.persona_id]
  if (current?.participa === true || current?.participa === false) return true
  if (Object.values(current?.ventas ?? {}).some((qty) => Number(qty) > 0)) return true
  return (Number(row.abonado) || 0) > 0
}

export type ParticipantDraftRow = {
  participa: boolean | ''
  ventas: Record<number, number>
}

export type ParticipantDraft = Record<number, ParticipantDraftRow>

export function emptyParticipantsDraft(members: EventParticipant[]): ParticipantDraft {
  return Object.fromEntries(
    members.map((row) => [
      row.persona_id,
      {
        participa: row.participa === true ? true : row.participa === false ? false : '',
        ventas: Object.fromEntries((row.ventas ?? []).map((venta) => [venta.producto_servicio_id, venta.cantidad])),
      },
    ]),
  )
}

export function participantsPayloadFromDraft(draft: ParticipantDraft) {
  return Object.entries(draft).map(([id, row]) => ({
    persona_id: Number(id),
    participa: row.participa === '' ? null : row.participa,
    ventas:
      row.participa === true
        ? Object.entries(row.ventas)
            .map(([productoId, cantidad]) => ({
              producto_servicio_id: Number(productoId),
              cantidad: Math.max(0, Number(cantidad) || 0),
            }))
            .filter((item) => item.cantidad > 0)
        : [],
  }))
}

function emptyRow(): ParticipantDraftRow {
  return { participa: '', ventas: {} }
}

function formatPrice(value: number | string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function servicePrice(service: EventParticipantService): number {
  const amount = Number(service.precio)
  return Number.isFinite(amount) ? amount : 0
}

export function participantEventCounts(
  members: EventParticipant[],
  services: EventParticipantService[],
  draft: ParticipantDraft,
) {
  const participan = members.filter((row) => draft[row.persona_id]?.participa === true).length
  const productQty = new Map<number, number>()
  const totals = members.reduce(
    (acc, row) => {
      const current = draft[row.persona_id]
      if (current?.participa !== true) return acc
      const billed = billedVentas(row, draft)
      services.forEach((service) => {
        const qty = Math.max(0, Number(billed[service.id]) || 0)
        if (qty <= 0) return
        productQty.set(service.id, (productQty.get(service.id) ?? 0) + qty)
      })
      const sale = saleTotals(services, billed)
      return {
        ...acc,
        unidades: acc.unidades + sale.unidades,
        recaudo: acc.recaudo + sale.recaudo,
        abonado: acc.abonado + (Number(row.abonado) || 0),
      }
    },
    { participan, unidades: 0, recaudo: 0, abonado: 0 },
  )
  return {
    ...totals,
    productos: services
      .map((service) => ({
        id: service.id,
        nombre: service.nombre,
        unidades: productQty.get(service.id) ?? 0,
      }))
      .filter((item) => item.unidades > 0),
  }
}

export function abonoProductOptions(
  services: EventParticipantService[],
  ventas: Record<number, number>,
  abonos: AbonoMovimiento[] = [],
) {
  return services.flatMap((service) => {
    const cantidad = Math.max(0, Number(ventas[service.id]) || 0)
    if (cantidad <= 0) return []
    const comprometido = cantidad * servicePrice(service)
    const abonado = abonos.reduce((sum, abono) => {
      if (Number(abono.producto_servicio_id) !== service.id) return sum
      if (abono.estado && abono.estado !== 'aprobado') return sum
      return sum + (Number(abono.monto) || 0)
    }, 0)
    return [
      {
        id: service.id,
        nombre: service.nombre,
        pendiente: Math.max(0, comprometido - abonado),
      },
    ]
  })
}

export function ParticipantEventStats({
  members,
  services,
  draft,
  eventEstado,
}: {
  members: EventParticipant[]
  services: EventParticipantService[]
  draft: ParticipantDraft
  eventEstado?: string | null
}) {
  const counts = useMemo(
    () => participantEventCounts(members, services, draft),
    [draft, members, services],
  )

  const showCobro = eventEstado === 'en_proceso' || eventEstado === 'cerrado'
  const participanPct = summaryPercent(counts.participan, members.length)
  const ingresadoPct = summaryPercent(counts.abonado, counts.recaudo)
  const porCobrar = Math.max(0, counts.recaudo - counts.abonado)
  const porCobrarPct = summaryPercent(porCobrar, counts.recaudo)

  return (
    <div className="event-stats" aria-live="polite">
      <SummaryKpi icon="users" tone="ok" label="Participan" value={counts.participan}>
        <ProgressBar value={participanPct} />
        <small>
          {counts.participan} de {members.length} integrantes
        </small>
      </SummaryKpi>
      <SummaryKpi icon="box" tone="gold" label="A vender" value={counts.unidades}>
        <small>Unidades en total</small>
        {counts.productos.length ? (
          <ul className="event-summary__units">
            {counts.productos.map((product) => (
              <li key={product.id}>
                <span>{product.nombre}</span>
                <strong>{product.unidades}</strong>
                <small>{product.unidades === 1 ? 'unidad' : 'unidades'}</small>
              </li>
            ))}
          </ul>
        ) : null}
      </SummaryKpi>
      <SummaryKpi icon="calculator" tone="info" label="Proyección total" value={formatPrice(counts.recaudo)}>
        <ProgressBar value={counts.recaudo > 0 ? 100 : 0} tone="info" />
        <small>100% estimado</small>
      </SummaryKpi>
      {showCobro ? (
        <SummaryKpi icon="trendUp" tone="ok" label="Ingresado en abonos" value={formatPrice(counts.abonado)}>
          <ProgressBar value={ingresadoPct} />
          <small>{ingresadoPct}% del total</small>
        </SummaryKpi>
      ) : null}
      {showCobro ? (
        <SummaryKpi
          icon="target"
          tone="danger"
          label="Falta por cobrar"
          value={formatPrice(porCobrar)}
          className="is-debt is-full"
        >
          <SummaryDonut value={porCobrarPct} label="del total" />
        </SummaryKpi>
      ) : null}
    </div>
  )
}

export function pendingProofs(members: EventParticipant[]) {
  return members.flatMap((row) =>
    (row.abonos ?? [])
      .filter((abono) => abono.estado === 'pendiente')
      .map((abono) => ({ abono, row })),
  )
}

type AbonoHistoryGroup = {
  key: string
  name: string
  photo: string | null
  shot: string | null
  abonos: AbonoMovimiento[]
  createdAt: string | null
}

function activityAbonoGroups(members: EventParticipant[]): AbonoHistoryGroup[] {
  const groups = new Map<string, AbonoHistoryGroup>()
  members.forEach((row) => {
    ;(row.abonos ?? []).forEach((abono) => {
      const shot = resolveFileUrl(abono.comprobante_url)
      const key = shot ? `${row.persona_id}:${shot}` : `abono:${abono.id}`
      const current = groups.get(key)
      if (current) {
        current.abonos.push(abono)
        if (String(abono.created_at ?? '') > String(current.createdAt ?? '')) {
          current.createdAt = abono.created_at ?? null
        }
        return
      }
      groups.set(key, {
        key,
        name: row.full_name,
        photo: resolveFileUrl(row.foto_url),
        shot,
        abonos: [abono],
        createdAt: abono.created_at ?? null,
      })
    })
  })
  return [...groups.values()].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
}

export function pendingProofGroups(members: EventParticipant[]) {
  return activityAbonoGroups(members).filter((group) => group.abonos.some((abono) => abono.estado === 'pendiente'))
}

function groupPersonAbonos(abonos: AbonoMovimiento[]): AbonoMovimiento[][] {
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

function amountQuery(value: string): string {
  return value.replace(/\D/g, '')
}

function AbonoHistoryPhoto({ src, label }: { src: string; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="attendance-proofs__photo" aria-label={label} onClick={() => setOpen(true)}>
        <img src={src} alt="" />
      </button>
      {open ? <ImagePreviewDialog src={src} alt={label} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

export function PendingProofsPanel({
  members,
  canReview = false,
  canEditAmount = false,
  canDeleteAmount = false,
  onReview,
  onChangeAmount,
  onDeleteAmount,
  onAttachProof,
}: {
  members: EventParticipant[]
  canReview?: boolean
  canEditAmount?: boolean
  canDeleteAmount?: boolean
  onReview?: (abono: AbonoMovimiento, estado: 'aprobado' | 'rechazado', monto?: number) => Promise<void>
  onChangeAmount?: (abono: AbonoMovimiento, monto: number) => Promise<void>
  onDeleteAmount?: (abono: AbonoMovimiento) => Promise<void>
  onAttachProof?: (abonos: AbonoMovimiento[], file: File) => Promise<void>
}) {
  const [nameQuery, setNameQuery] = useState('')
  const [valueQuery, setValueQuery] = useState('')
  const history = activityAbonoGroups(members)
  const pending = pendingProofGroups(members).length
  const valueDigits = amountQuery(valueQuery)
  const filtered = history.filter((group) => {
    const nameOk = group.name.toLocaleLowerCase('es').includes(nameQuery.trim().toLocaleLowerCase('es'))
    const total = group.abonos.reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0)
    const valueOk =
      valueDigits === '' ||
      String(Math.round(total)).includes(valueDigits) ||
      group.abonos.some((abono) => String(Math.round(Number(abono.monto) || 0)).includes(valueDigits))
    return nameOk && valueOk
  })

  return (
    <div className="attendance-proofs">
      <div className="attendance-proofs__filters">
        <label>
          Nombre
          <input
            value={nameQuery}
            placeholder="Buscar participante"
            onChange={(event) => setNameQuery(event.target.value)}
          />
        </label>
        <label>
          Valor
          <input
            inputMode="numeric"
            value={valueQuery}
            placeholder="Buscar monto"
            onChange={(event) => setValueQuery(event.target.value)}
          />
        </label>
      </div>
      {pending > 0 ? (
        <p className="attendance-proofs__total">
          <strong>{pending}</strong>
          <span>{pending === 1 ? 'comprobante por confirmar' : 'comprobantes por confirmar'}</span>
        </p>
      ) : null}
      {history.length === 0 ? (
        <p className="app-panel__muted">Todavía no hay abonos en esta actividad.</p>
      ) : filtered.length === 0 ? (
        <p className="app-panel__muted">Ningún abono coincide con el filtro.</p>
      ) : (
        <div className="attendance-proofs__table" role="table">
          <div className="attendance-proofs__row is-head" role="row">
            <span role="columnheader">Foto</span>
            <span role="columnheader">Nombre</span>
            <span role="columnheader">Fecha</span>
            <span role="columnheader">Valor abonado</span>
          </div>
          {filtered.map((group) => {
            const pendingItems = group.abonos.filter((abono) => abono.estado === 'pendiente')
            const allPending = pendingItems.length === group.abonos.length
            const estado =
              pendingItems.length > 0
                ? pendingItems.length > 1
                  ? `Pendiente · ${pendingItems.length} productos`
                  : abonoEstadoLabel(pendingItems[0])
                : group.abonos.every((abono) => abono.estado === 'eliminado')
                  ? 'Eliminado'
                  : group.abonos.every((abono) => abono.estado === 'rechazado')
                    ? 'Rechazado'
                    : null
            const products = group.abonos
              .map((abono) => abono.producto_nombre)
              .filter(Boolean)
              .join(' · ')
            const total = group.abonos.reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0)
            const canAttachShot =
              Boolean(canReview && onAttachProof) &&
              !group.shot &&
              group.abonos.some((abono) => abono.estado !== 'eliminado')
            return (
              <div key={group.key} className="attendance-proofs__entry">
                <div className="attendance-proofs__row" role="row">
                  <span className="attendance-proofs__cell is-photo" role="cell">
                    {group.photo ? (
                      <AbonoHistoryPhoto src={group.photo} label={`Foto de ${group.name}`} />
                    ) : (
                      <span className="attendance-proofs__photo is-empty" aria-hidden="true">
                        {memberInitials(group.name)}
                      </span>
                    )}
                  </span>
                  <span className="attendance-proofs__cell is-name" role="cell">
                    <strong>{group.name}</strong>
                    {products ? <small>{products}</small> : null}
                    {estado ? <small>{estado}</small> : null}
                  </span>
                  <span className="attendance-proofs__cell is-date" role="cell">
                    {group.createdAt ? formatDate(group.createdAt) : '—'}
                  </span>
                  <span className="attendance-proofs__cell is-amount" role="cell">
                    <span className="attendance-proofs__amount-end">
                      {group.shot ? <AbonoShotButton abono={group.abonos[0]} /> : null}
                      {canAttachShot ? (
                        <AbonoProofAttachButton
                          onAttach={async (file) => {
                            await onAttachProof?.(group.abonos, file)
                          }}
                        />
                      ) : null}
                      {allPending || pendingItems.length > 0 ? (
                        <strong>{formatPrice(total)}</strong>
                      ) : group.abonos.length === 1 ? (
                        <AbonoAmountControl
                          abono={group.abonos[0]}
                          canEdit={canEditAmount}
                          canDelete={canDeleteAmount}
                          onSave={onChangeAmount}
                          onDelete={onDeleteAmount}
                        />
                      ) : (
                        <div className="attendance-proofs__amounts">
                          {group.abonos.map((abono) => (
                            <AbonoAmountControl
                              key={abono.id}
                              abono={abono}
                              canEdit={canEditAmount}
                              canDelete={canDeleteAmount}
                              onSave={onChangeAmount}
                              onDelete={onDeleteAmount}
                            />
                          ))}
                        </div>
                      )}
                    </span>
                  </span>
                </div>
                <AbonoProofReview abonos={group.abonos} canReview={canReview} hideShot onReview={onReview} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function billedVentas(row: EventParticipant, draft: ParticipantDraft): Record<number, number> {
  const requested = draft[row.persona_id]?.ventas ?? {}
  const saved = new Map((row.ventas ?? []).map((venta) => [venta.producto_servicio_id, venta]))
  const ids = new Set<number>([...Object.keys(requested).map(Number), ...saved.keys()])
  const out: Record<number, number> = {}
  ids.forEach((id) => {
    const pedido = Number(requested[id] ?? saved.get(id)?.cantidad ?? 0)
    const entregada = saved.get(id)?.cantidad_entregada
    out[id] = entregada == null ? pedido : entregada
  })
  return out
}

export function saleTotals(services: EventParticipantService[], ventas: Record<number, number>) {
  return services.reduce(
    (acc, service) => {
      const cantidad = Math.max(0, Number(ventas[service.id]) || 0)
      const total = cantidad * servicePrice(service)
      return { unidades: acc.unidades + cantidad, recaudo: acc.recaudo + total }
    },
    { unidades: 0, recaudo: 0 },
  )
}

export function saleGain(services: EventParticipantService[], ventas: Record<number, number>) {
  return services.reduce((sum, service) => {
    const cantidad = Math.max(0, Number(ventas[service.id]) || 0)
    const unidad = Number(service.ganancia_unidad)
    return sum + cantidad * (Number.isFinite(unidad) ? unidad : 0)
  }, 0)
}

type ParticipantsMarkListProps = {
  members: EventParticipant[]
  services: EventParticipantService[]
  draft: ParticipantDraft
  canEdit: boolean
  canAbonar?: boolean
  eventEstado?: string | null
  participationLocked?: boolean
  saving?: boolean
  payingId?: number | null
  onChange: (personaId: number, participa: boolean | '') => void
  onQty: (personaId: number, productoServicioId: number, cantidad: number) => void
  onMarkAll: (participa: boolean | '', mode: 'all' | 'empty') => void
  onStartAbono?: (personaId: number) => void
  onReviewAbono?: (abono: AbonoMovimiento, estado: 'aprobado' | 'rechazado', monto?: number) => Promise<void>
}

export function ParticipantsMarkList({
  members,
  services,
  draft,
  canEdit,
  canAbonar = false,
  eventEstado = null,
  participationLocked = false,
  saving = false,
  payingId = null,
  onChange,
  onQty,
  onMarkAll,
  onStartAbono,
  onReviewAbono,
}: ParticipantsMarkListProps) {
  const showAbonoTotals = eventEstado === 'en_proceso' || eventEstado === 'cerrado'
  const canStartAbono = Boolean(canAbonar && eventEstado === 'en_proceso' && onStartAbono)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<ParticipantSort>('nombre')
  const [openIds, setOpenIds] = useState<number[]>([])
  const [pending, setPending] = useState<BulkParticipa | null>(null)

  const markedCount = useMemo(
    () => members.filter((row) => rowHasData(row, draft)).length,
    [draft, members],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = needle
      ? members.filter((row) => {
          const haystack = `${row.full_name} ${row.identificacion ?? ''}`.toLowerCase()
          return haystack.includes(needle)
        })
      : [...members]

    const qty = (row: EventParticipant) => {
      const current = draft[row.persona_id]
      if (current?.participa !== true) return 0
      return saleTotals(services, billedVentas(row, draft)).unidades
    }
    const participaRank = (row: EventParticipant) => {
      const value = draft[row.persona_id]?.participa
      if (value === true) return 0
      if (value === false) return 1
      return 2
    }
    const byName = (a: EventParticipant, b: EventParticipant) =>
      (a.full_name || '').localeCompare(b.full_name || '', 'es', { sensitivity: 'base' })

    rows.sort((a, b) => {
      if (sort === 'cantidad_desc') {
        const diff = qty(b) - qty(a)
        return diff !== 0 ? diff : byName(a, b)
      }
      if (sort === 'cantidad_asc') {
        const diff = qty(a) - qty(b)
        return diff !== 0 ? diff : byName(a, b)
      }
      if (sort === 'participan') {
        const diff = participaRank(a) - participaRank(b)
        return diff !== 0 ? diff : byName(a, b)
      }
      if (sort === 'no_participan') {
        const rank = (row: EventParticipant) => {
          const value = draft[row.persona_id]?.participa
          if (value === false) return 0
          if (value === true) return 1
          return 2
        }
        const diff = rank(a) - rank(b)
        return diff !== 0 ? diff : byName(a, b)
      }
      return byName(a, b)
    })

    return rows
  }, [draft, members, query, services, sort])

  function requestBulk(participa: BulkParticipa) {
    if (markedCount === 0) {
      onMarkAll(participa, 'all')
      return
    }
    setPending(participa)
  }

  function confirmBulk(mode: 'all' | 'empty') {
    if (pending === null) return
    onMarkAll(pending, mode)
    setPending(null)
  }

  useEffect(() => {
    if (pending === null) return undefined
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setPending(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending])

  function toggleOpen(personaId: number) {
    setOpenIds((current) =>
      current.includes(personaId) ? current.filter((id) => id !== personaId) : [...current, personaId],
    )
  }

  return (
    <div className="attendance-mark">
      <div className="attendance-mark__toolbar-row">
        <label className="attendance-mark__search">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o documento"
          />
        </label>
        <label className="attendance-mark__sort">
          Ordenar
          <select value={sort} onChange={(event) => setSort(event.target.value as ParticipantSort)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {canEdit ? (
        <div className="attendance-mark__bulk">
          <button type="button" className="app-panel__btn--ghost" onClick={() => requestBulk(true)}>
            Todos participan
          </button>
          <button type="button" className="app-panel__btn--ghost" onClick={() => requestBulk(false)}>
            Nadie participa
          </button>
          <button type="button" className="app-panel__btn--ghost" onClick={() => requestBulk('')}>
            Limpiar
          </button>
        </div>
      ) : null}

      {pending !== null ? (
        <div className="attendance-confirm" role="dialog" aria-modal="true" aria-labelledby="participants-confirm-title">
          <button
            type="button"
            className="attendance-confirm__backdrop"
            aria-label="Cancelar"
            onClick={() => setPending(null)}
          />
          <AppPanel className="attendance-confirm__panel" shine={false}>
            <p className="app-panel__kicker">Confirmar</p>
            <h2 className="app-panel__title" id="participants-confirm-title">
              {BULK_COPY[bulkKey(pending)].title}
            </h2>
            <p className="app-panel__subtitle">
              Hay {markedCount} integrante{markedCount === 1 ? '' : 's'} que ya {markedCount === 1 ? 'tiene' : 'tienen'}{' '}
              participación, cantidades o abonos. Puedes dejar esos datos o cambiarlos para que queden como{' '}
              {BULK_COPY[bulkKey(pending)].apply}.
            </p>
            <div className="attendance-confirm__actions">
              <button type="button" className="app-panel__btn--ghost" onClick={() => setPending(null)}>
                Cancelar
              </button>
              <button type="button" className="app-panel__btn--ghost" onClick={() => confirmBulk('empty')}>
                Dejar los que ya tienen
              </button>
              <button type="button" className="app-panel__btn--primary" onClick={() => confirmBulk('all')}>
                Cambiar todos
              </button>
            </div>
          </AppPanel>
        </div>
      ) : null}

      <div className="attendance-mark__list attendance-mark__list--sales">
        {filtered.map((row, index) => {
          const current = draft[row.persona_id] ?? emptyRow()
          const selected = current.participa
          const open = openIds.includes(row.persona_id)
          const totals = saleTotals(services, billedVentas(row, draft))
          const abonado = Number(row.abonado) || 0
          const pendiente = totals.recaudo - abonado
          const photo = resolveFileUrl(row.foto_url)
          return (
            <article
              key={row.persona_id}
              className={`attendance-mark__card attendance-mark__card--sales${
                selected === true ? ' is-presente' : selected === false ? ' is-justificado' : ''
              }${open ? ' is-open' : ''}`}
              style={{ animationDelay: `${Math.min(index, 16) * 28}ms` }}
            >
              <header className="attendance-mark__head">
                <span className="attendance-mark__avatar" aria-hidden="true">
                  {photo ? <img src={photo} alt="" /> : memberInitials(row.full_name)}
                </span>
                <div className="attendance-mark__who">
                  <p title={row.full_name}>{row.full_name}</p>
                  <div className="attendance-mark__icons" role="group" aria-label={`Participación de ${row.full_name}`}>
                    <button
                      type="button"
                      className={`attendance-mark__icon attendance-mark__icon--text attendance-mark__icon--presente${
                        selected === true ? ' is-on' : ''
                      }`}
                      aria-pressed={selected === true}
                      disabled={!canEdit}
                      onClick={() => onChange(row.persona_id, selected === true ? '' : true)}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      className={`attendance-mark__icon attendance-mark__icon--text attendance-mark__icon--justificado${
                        selected === false ? ' is-on' : ''
                      }`}
                      aria-pressed={selected === false}
                      disabled={!canEdit}
                      onClick={() => onChange(row.persona_id, selected === false ? '' : false)}
                    >
                      No
                    </button>
                  </div>
                </div>
                {selected === true ? (
                  <button
                    type="button"
                    className="attendance-mark__sales-toggle"
                    aria-expanded={open}
                    onClick={() => toggleOpen(row.persona_id)}
                  >
                    <AdminIcon name="box" />
                    <span>
                      {services.length === 0
                        ? 'Sin servicios'
                        : totals.unidades
                          ? `${totals.unidades} uds · ${formatPrice(totals.recaudo)}`
                          : 'Sin cantidades'}
                    </span>
                    <AdminIcon name="chevronRight" />
                  </button>
                ) : null}
              </header>
              {selected === true && open ? (
                <div className="attendance-mark__sales is-open">
                  {services.length === 0 ? (
                    <p className="attendance-mark__sales-empty">Asocia servicios en la ficha del evento.</p>
                  ) : (
                    <ul className="attendance-mark__sale-list">
                      {services.map((service) => {
                        const cantidad = current.ventas[service.id] ?? 0
                        const saved = row.ventas?.find((venta) => venta.producto_servicio_id === service.id)
                        const entregada = saved?.cantidad_entregada
                        const cobrada = entregada == null ? cantidad : entregada
                        const linea = cobrada * servicePrice(service)
                        return (
                          <li key={service.id} className="attendance-mark__sale">
                            <span className="attendance-mark__sale-name">
                              <ServiceThumb item={service} />
                              <strong>{service.nombre}</strong>
                            </span>
                            <div className="attendance-mark__stepper">
                              <button
                                type="button"
                                aria-label={`Quitar una unidad de ${service.nombre}`}
                                disabled={!canEdit || cantidad <= 0}
                                onClick={() => onQty(row.persona_id, service.id, Math.max(0, cantidad - 1))}
                              >
                                −
                              </button>
                              <strong>{cantidad}</strong>
                              <button
                                type="button"
                                aria-label={`Agregar una unidad de ${service.nombre}`}
                                disabled={!canEdit}
                                onClick={() => onQty(row.persona_id, service.id, cantidad + 1)}
                              >
                                +
                              </button>
                            </div>
                            <span className="attendance-mark__sale-metric">
                              <small>Precio unitario</small>
                              <strong>{formatPrice(servicePrice(service))}</strong>
                            </span>
                            <span className="attendance-mark__sale-metric is-total">
                              <small>{entregada != null ? `Pedido ${cantidad}` : 'Total'}</small>
                              <strong>{formatPrice(linea)}</strong>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {showAbonoTotals ? (
                    <div className="attendance-mark__abono-bar">
                      <p className="attendance-mark__abono-metric is-paid">
                        <AdminIcon name="coins" />
                        <span>
                          <small>Abonado</small>
                          <strong>{formatPrice(abonado)}</strong>
                        </span>
                      </p>
                      <p className="attendance-mark__abono-metric is-due">
                        <AdminIcon name="hourglass" />
                        <span>
                          <small>Faltante</small>
                          <strong>{formatPrice(Math.max(0, pendiente))}</strong>
                        </span>
                      </p>
                      {canStartAbono && pendiente > 0 ? (
                        <button
                          type="button"
                          className="app-panel__btn--primary"
                          disabled={payingId === row.persona_id}
                          onClick={() => onStartAbono?.(row.persona_id)}
                        >
                          <AdminIcon name="wallet" />
                          Abonar
                        </button>
                      ) : pendiente <= 0 ? (
                        <span className="attendance-mark__paid">
                          <AdminIcon name="check" />
                          Al día
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {row.abonos?.length ? (
                    <section className="attendance-mark__history">
                      <h4>
                        <AdminIcon name="idCard" />
                        Historial de pagos
                      </h4>
                      <ul className="attendance-mark__abonos">
                        {groupPersonAbonos(row.abonos).map((group) => {
                          const lead = group[0]
                          const products = group.map((abono) => abono.producto_nombre).filter(Boolean).join(' · ')
                          const total = group.reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0)
                          const pending = group.some((abono) => abono.estado === 'pendiente')
                          return (
                            <li key={group.map((abono) => abono.id).join('-')}>
                              <span className="attendance-mark__abono-when">
                                <strong>{formatDate(lead.created_at)}</strong>
                                {products ? <small>{products}</small> : null}
                                {lead.nota ? <small>{lead.nota}</small> : null}
                                {group.length > 1 ? <small>{group.length} productos</small> : null}
                              </span>
                              <span className="attendance-mark__abono-end">
                                <AbonoShotButton abono={lead} />
                                <strong>
                                  {pending
                                    ? abonoEstadoLabel(group.find((abono) => abono.estado === 'pendiente')!) ?? 'Pendiente'
                                    : formatPrice(total)}
                                </strong>
                              </span>
                              <AbonoProofReview abonos={group} canReview={canAbonar} hideShot onReview={onReviewAbono} />
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      {saving ? <p className="app-panel__muted">Guardando…</p> : null}
      {participationLocked ? (
        <p className="app-panel__hint">
          La actividad ya está en curso. Aquí solo puedes consultar y registrar abonos.
        </p>
      ) : null}
      {!canEdit && !participationLocked ? (
        <p className="app-panel__hint">Solo la directiva puede registrar participantes.</p>
      ) : null}
      {canAbonar ? (
        <p className="app-panel__hint">Pulsa Abonar en un participante para registrar el recaudo.</p>
      ) : null}
    </div>
  )
}
