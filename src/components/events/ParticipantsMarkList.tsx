import { useMemo, useState } from 'react'
import type { EventParticipant, EventParticipantService } from '../../api/types'
import { formatDate } from '../../theme/dates'
import { ServiceThumb } from '../services/ServiceVisual'
import '../../theme/attendance-mark.css'

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

type ParticipantsMarkListProps = {
  members: EventParticipant[]
  services: EventParticipantService[]
  draft: ParticipantDraft
  canEdit: boolean
  canAbonar?: boolean
  participationLocked?: boolean
  saving?: boolean
  payingId?: number | null
  onChange: (personaId: number, participa: boolean | '') => void
  onQty: (personaId: number, productoServicioId: number, cantidad: number) => void
  onMarkAll: (participa: boolean | '') => void
  onStartAbono?: (personaId: number) => void
}

export function ParticipantsMarkList({
  members,
  services,
  draft,
  canEdit,
  canAbonar = false,
  participationLocked = false,
  saving = false,
  payingId = null,
  onChange,
  onQty,
  onMarkAll,
  onStartAbono,
}: ParticipantsMarkListProps) {
  const [query, setQuery] = useState('')
  const [openIds, setOpenIds] = useState<number[]>([])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return members
    return members.filter((row) => {
      const haystack = `${row.full_name} ${row.identificacion ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [members, query])

  const counts = useMemo(() => {
    const participan = members.filter((row) => draft[row.persona_id]?.participa === true).length
    const noParticipan = members.filter((row) => draft[row.persona_id]?.participa === false).length
    return members.reduce(
      (acc, row) => {
        const current = draft[row.persona_id]
        if (current?.participa !== true) return acc
        const totals = saleTotals(services, current.ventas)
        return {
          ...acc,
          unidades: acc.unidades + totals.unidades,
          recaudo: acc.recaudo + totals.recaudo,
          abonado: acc.abonado + (Number(row.abonado) || 0),
        }
      },
      {
        participan,
        noParticipan,
        sinMarcar: members.length - participan - noParticipan,
        unidades: 0,
        recaudo: 0,
        abonado: 0,
      },
    )
  }, [draft, members, services])

  function toggleOpen(personaId: number) {
    setOpenIds((current) =>
      current.includes(personaId) ? current.filter((id) => id !== personaId) : [...current, personaId],
    )
  }

  return (
    <div className="attendance-mark">
      <div className="attendance-mark__toolbar">
        <div className="attendance-mark__stats attendance-mark__stats--money" aria-live="polite">
          <p className="attendance-mark__stat attendance-mark__stat--presente">
            <strong>{counts.participan}</strong>
            <span>Participan</span>
          </p>
          <p className="attendance-mark__stat attendance-mark__stat--ausente">
            <strong>{counts.noParticipan}</strong>
            <span>No participan</span>
          </p>
          <p className="attendance-mark__stat">
            <strong>{counts.sinMarcar}</strong>
            <span>Sin marcar</span>
          </p>
          <p className="attendance-mark__stat attendance-mark__stat--puntual">
            <strong>{counts.unidades}</strong>
            <span>A vender</span>
          </p>
          <p className="attendance-mark__stat attendance-mark__stat--puntual">
            <strong>{formatPrice(counts.recaudo)}</strong>
            <span>Recaudo</span>
          </p>
          <p className="attendance-mark__stat attendance-mark__stat--presente">
            <strong>{formatPrice(counts.abonado)}</strong>
            <span>Abonado</span>
          </p>
        </div>
      </div>
      <label className="attendance-mark__search">
        Buscar
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre o documento"
        />
      </label>

      {canEdit ? (
        <div className="attendance-mark__bulk">
          <button type="button" className="app-panel__btn--ghost" onClick={() => onMarkAll(true)}>
            Todos participan
          </button>
          <button type="button" className="app-panel__btn--ghost" onClick={() => onMarkAll(false)}>
            Nadie participa
          </button>
          <button type="button" className="app-panel__btn--ghost" onClick={() => onMarkAll('')}>
            Limpiar
          </button>
        </div>
      ) : null}

      <div className="attendance-mark__list attendance-mark__list--sales">
        {filtered.map((row, index) => {
          const current = draft[row.persona_id] ?? emptyRow()
          const selected = current.participa
          const open = openIds.includes(row.persona_id)
          const totals = saleTotals(services, current.ventas)
          const abonado = Number(row.abonado) || 0
          const pendiente = totals.recaudo - abonado
          return (
            <article
              key={row.persona_id}
              className={`attendance-mark__card attendance-mark__card--sales${
                selected === true ? ' is-presente' : selected === false ? ' is-justificado' : ''
              }`}
              style={{ animationDelay: `${Math.min(index, 16) * 28}ms` }}
            >
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
                  {selected === true ? (
                    <button
                      type="button"
                      className="attendance-mark__sales-toggle"
                      aria-expanded={open}
                      onClick={() => toggleOpen(row.persona_id)}
                    >
                      <span>
                        {services.length === 0
                          ? 'Sin servicios en el evento'
                          : totals.unidades
                            ? `${totals.unidades} uds · ${formatPrice(totals.recaudo)}`
                            : 'Sin cantidades'}
                      </span>
                      <small>{open ? 'Cerrar' : canAbonar ? 'Servicios y abonos' : 'Ver servicios'}</small>
                    </button>
                  ) : null}
                </div>
                {selected === true && open ? (
                  <div className="attendance-mark__sales is-open">
                    {services.length === 0 ? (
                      <p className="attendance-mark__sales-empty">Asocia servicios en la ficha del evento.</p>
                    ) : (
                      <ul className="attendance-mark__sale-list">
                        {services.map((service) => {
                          const cantidad = current.ventas[service.id] ?? 0
                          const linea = cantidad * servicePrice(service)
                          return (
                            <li key={service.id} className="attendance-mark__sale">
                              <span className="attendance-mark__sale-name">
                                <ServiceThumb item={service} />
                                {service.nombre}
                              </span>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                inputMode="numeric"
                                aria-label={`Cantidad de ${service.nombre} para ${row.full_name}`}
                                disabled={!canEdit}
                                value={cantidad}
                                onChange={(event) => onQty(row.persona_id, service.id, Number(event.target.value))}
                              />
                              <span className="attendance-mark__sale-price">
                                <small>{formatPrice(servicePrice(service))}</small>
                                <strong>{formatPrice(linea)}</strong>
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    {canAbonar && onStartAbono ? (
                      <div className="attendance-mark__abono-bar">
                        <p className="attendance-mark__abono-summary">
                          Abonado {formatPrice(abonado)} · Faltante {formatPrice(pendiente)}
                        </p>
                        <button
                          type="button"
                          className="app-panel__btn--primary"
                          disabled={payingId === row.persona_id || pendiente <= 0}
                          onClick={() => onStartAbono(row.persona_id)}
                        >
                          Abonar
                        </button>
                      </div>
                    ) : null}
                    {row.abonos?.length ? (
                      <ul className="attendance-mark__abonos">
                        {row.abonos.map((abono) => (
                          <li key={abono.id}>
                            <span>
                              {formatDate(abono.created_at)}
                              {abono.nota ? ` · ${abono.nota}` : ''}
                            </span>
                            <strong>{formatPrice(abono.monto)}</strong>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
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
