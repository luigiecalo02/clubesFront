import { useEffect, useMemo, useRef, useState } from 'react'
import type { AttendanceEvent } from '../../api/types'

type AttendanceEventSelectProps = {
  items: AttendanceEvent[]
  eventoId: number | null
  label: string
  onSelect: (id: number) => void
}

export function formatEventChipDate(start?: string | null): string {
  if (!start) return 'Sin fecha'
  const from = new Date(start)
  if (Number.isNaN(from.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(from)
}

function eventSearchText(item: AttendanceEvent): string {
  const start = item.starts_at ? new Date(item.starts_at) : null
  const parts = [item.name]
  if (start && !Number.isNaN(start.getTime())) {
    parts.push(formatEventChipDate(item.starts_at))
    parts.push(start.toISOString().slice(0, 10))
    parts.push(new Intl.DateTimeFormat('es-CO').format(start))
    parts.push(
      new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(start),
    )
    parts.push(
      `${start.getDate()}/${start.getMonth() + 1}/${start.getFullYear()}`,
      `${start.getDate()}/${start.getMonth() + 1}`,
    )
  }
  return parts.join(' ').toLowerCase()
}

function eventCounts(item: AttendanceEvent): string {
  if (typeof item.presentes_count !== 'number') return ''
  return ` · ${item.presentes_count}/${item.integrantes_count ?? 0}`
}

export function AttendanceEventSelect({ items, eventoId, label, onSelect }: AttendanceEventSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = items.find((item) => item.id === eventoId) ?? null

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => eventSearchText(item).includes(needle))
  }, [items, query])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  if (!items.length) return null

  function choose(id: number) {
    onSelect(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="attendance-events__group">
      <p className="app-panel__kicker">{label}</p>
      <div className={`admin-search-select attendance-event-select${open ? ' is-open' : ''}`} ref={rootRef}>
        {open ? (
          <input
            ref={inputRef}
            className="admin-search-select__input"
            value={query}
            placeholder="Nombre o fecha"
            aria-label={`Buscar en ${label}`}
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setOpen(false)
                setQuery('')
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="admin-search-select__trigger"
            aria-haspopup="listbox"
            aria-expanded={false}
            aria-label={label}
            onClick={() => setOpen(true)}
          >
            {selected ? (
              <>
                {selected.name}
                <small>
                  {formatEventChipDate(selected.starts_at)}
                  {eventCounts(selected)}
                </small>
              </>
            ) : (
              'Elegir evento…'
            )}
          </button>
        )}
        {open ? (
          <ul className="admin-search-select__list" role="listbox" aria-label={label}>
            {filtered.length ? (
              filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`admin-search-select__option${item.id === eventoId ? ' is-on' : ''}`}
                    role="option"
                    aria-selected={item.id === eventoId}
                    onClick={() => choose(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <small>
                      {formatEventChipDate(item.starts_at)}
                      {eventCounts(item)}
                    </small>
                  </button>
                </li>
              ))
            ) : (
              <li className="admin-search-select__empty">Ningún evento coincide.</li>
            )}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
