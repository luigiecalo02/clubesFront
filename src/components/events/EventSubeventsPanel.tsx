import { useEffect, useState, type FormEvent } from 'react'
import { eventsApi } from '../../api/events'
import { getApiErrorMessage } from '../../api/client'
import type { EventSummary, EventTipo } from '../../api/types'
import { formatEventRange } from './EventCard'

function toDateInput(value?: string | null): string {
  const parsed = value ? new Date(value) : new Date()
  if (Number.isNaN(parsed.getTime())) {
    const next = new Date()
    next.setDate(next.getDate() + 7)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

function toIsoFromDate(value: string, endOfDay = false): string {
  return new Date(`${value}${endOfDay ? 'T23:59:00' : 'T00:00:00'}`).toISOString()
}

type EventSubeventsPanelProps = {
  parent: EventSummary
  tipos: EventTipo[]
  canCreate: boolean
  onCount?: (count: number) => void
}

export function EventSubeventsPanel({ parent, tipos, canCreate, onCount }: EventSubeventsPanelProps) {
  const [children, setChildren] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [startsAt, setStartsAt] = useState(() => toDateInput(parent.starts_at))
  const [endsAt, setEndsAt] = useState(() => toDateInput(parent.ends_at || parent.starts_at))
  const [tipoId, setTipoId] = useState('')

  async function loadChildren() {
    const next = await eventsApi.children(parent.id)
    setChildren(next)
    onCount?.(next.length)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    eventsApi
      .children(parent.id)
      .then((next) => {
        if (cancelled) return
        setChildren(next)
        onCount?.(next.length)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudieron cargar los subeventos'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [parent.id, parent.starts_at, parent.ends_at])

  function resetForm() {
    setName('')
    setDescripcion('')
    setStartsAt(toDateInput(parent.starts_at))
    setEndsAt(toDateInput(parent.ends_at || parent.starts_at))
    setTipoId('')
    setShowForm(false)
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!canCreate) return
    setError('')
    setSaved('')
    setSubmitting(true)
    try {
      await eventsApi.create({
        name: name.trim(),
        descripcion: descripcion.trim() || undefined,
        lugar: parent.lugar || undefined,
        starts_at: toIsoFromDate(startsAt),
        ends_at: toIsoFromDate(endsAt, true),
        tipo_evento_id: tipoId ? Number(tipoId) : parent.tipo_evento?.id ?? null,
        evento_padre_id: parent.id,
      })
      setSaved('Subevento creado.')
      resetForm()
      await loadChildren()
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo crear el subevento'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-subevents">
      <p className="app-panel__muted">
        Crea actividades hijas de este evento, como en ProjectJA. Quedan ligadas a estas fechas.
      </p>
      {error ? (
        <p className="app-panel__alert" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="app-panel__ok" role="status">
          {saved}
        </p>
      ) : null}

      {loading ? <p className="app-panel__muted">Cargando subeventos…</p> : null}
      {!loading && children.length === 0 && !showForm ? (
        <p className="app-panel__muted">Aún no hay subeventos.</p>
      ) : null}

      {!loading && children.length ? (
        <ul className="admin-subevents__list">
          {children.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <small>{formatEventRange(item.starts_at, item.ends_at)}</small>
            </li>
          ))}
        </ul>
      ) : null}

      {canCreate && !showForm ? (
        <button type="button" className="app-panel__btn--ghost" onClick={() => setShowForm(true)}>
          Agregar subevento
        </button>
      ) : null}

      {canCreate && showForm ? (
        <form className="admin-form" onSubmit={onSave}>
          <label>
            Nombre
            <input
              value={name}
              required
              maxLength={255}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Descripción
            <textarea
              value={descripcion}
              rows={2}
              onChange={(event) => setDescripcion(event.target.value)}
            />
          </label>
          {tipos.length ? (
            <label>
              Tipo
              <select value={tipoId} onChange={(event) => setTipoId(event.target.value)}>
                <option value="">Igual que el evento</option>
                {tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Fecha de inicio
            <input
              type="date"
              required
              min={toDateInput(parent.starts_at)}
              max={toDateInput(parent.ends_at || parent.starts_at)}
              value={startsAt}
              onChange={(event) => {
                const next = event.target.value
                setStartsAt(next)
                if (endsAt < next) setEndsAt(next)
              }}
            />
          </label>
          <label>
            Fecha de fin
            <input
              type="date"
              required
              min={startsAt}
              max={toDateInput(parent.ends_at || startsAt)}
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>
          <div className="admin-form__actions">
            <button type="button" className="app-panel__btn--ghost" onClick={resetForm}>
              Cancelar
            </button>
            <button type="submit" className="app-panel__btn--primary" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar subevento'}
            </button>
          </div>
        </form>
      ) : null}

      {!canCreate ? (
        <p className="app-panel__hint">Tu rol puede ver los subeventos, pero no crearlos.</p>
      ) : null}
    </div>
  )
}
