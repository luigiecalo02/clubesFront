import { useEffect, useMemo, useRef, useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { serviciosApi } from '../../api/servicios'
import type { ClubServicio } from '../../api/types'
import { ServiceThumb } from '../services/ServiceVisual'
import { useNotice } from '../../theme/NoticeProvider'

function formatPrice(value: number | string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

type EventServicesFieldProps = {
  catalog: ClubServicio[]
  selectedIds: number[]
  loading?: boolean
  canCreate?: boolean
  hideLegend?: boolean
  lockRemovals?: boolean
  onChange: (ids: number[]) => void
  onCreated?: (service: ClubServicio) => void
}

export function EventServicesField({
  catalog,
  selectedIds,
  loading = false,
  canCreate = false,
  hideLegend = false,
  lockRemovals = false,
  onChange,
  onCreated,
}: EventServicesFieldProps) {
  const notices = useNotice()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [precio, setPrecio] = useState('')
  const [creating, setCreating] = useState(false)
  const [askPrice, setAskPrice] = useState(false)

  const selected = useMemo(
    () => selectedIds.map((id) => catalog.find((item) => item.id === id)).filter((item): item is ClubServicio => Boolean(item)),
    [catalog, selectedIds],
  )

  const needle = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!needle) return []
    return catalog.filter(
      (item) => !selectedIds.includes(item.id) && item.nombre.toLowerCase().includes(needle),
    )
  }, [catalog, needle, selectedIds])

  const exactMatch = catalog.some((item) => item.nombre.trim().toLowerCase() === needle)
  const canOfferCreate = canCreate && needle.length > 0 && !exactMatch

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
        setPrecio('')
        setAskPrice(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function add(id: number) {
    if (selectedIds.includes(id)) return
    onChange([...selectedIds, id])
    setQuery('')
    setPrecio('')
    setAskPrice(false)
    setOpen(false)
  }

  function remove(id: number) {
    if (lockRemovals) {
      notices.warning('Ya hay un abono en esta actividad. No se pueden quitar servicios.')
      return
    }
    onChange(selectedIds.filter((item) => item !== id))
  }

  async function createService() {
    const nombre = query.trim()
    const amount = Number(precio)
    if (!canCreate || !nombre) return
    if (!Number.isFinite(amount) || amount < 0) {
      notices.warning('Indica un precio válido para el servicio nuevo.')
      return
    }
    setCreating(true)
    try {
      const created = await serviciosApi.create({
        nombre,
        precio: amount,
        activo: true,
      })
      onCreated?.(created)
      onChange([...selectedIds, created.id])
      setQuery('')
      setPrecio('')
      setAskPrice(false)
      setOpen(false)
      notices.success('Servicio creado y agregado al evento.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo crear el servicio'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={`admin-service-picks${hideLegend ? ' admin-service-picks--bare' : ''}`}>
      {hideLegend ? (
        <p className="sr-only">Servicios del club</p>
      ) : (
        <p className="admin-service-picks__legend">Servicios del club</p>
      )}
      {loading ? <p className="app-panel__muted">Cargando servicios…</p> : null}

      {selected.length ? (
        <ul className="admin-service-picks__chips">
          {selected.map((item) => (
            <li key={item.id} className="admin-service-picks__chip">
              <ServiceThumb item={item} />
              <span>
                {item.nombre}
                <small>{formatPrice(item.precio)}</small>
              </span>
              {lockRemovals ? null : (
                <button type="button" aria-label={`Quitar ${item.nombre}`} onClick={() => remove(item.id)}>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="app-panel__muted">Todavía no hay servicios en este evento.</p>
      )}
      {lockRemovals && selected.length ? (
        <p className="app-panel__hint">Ya hay un abono en esta actividad. Puedes agregar servicios, pero no quitarlos.</p>
      ) : null}

      <div
        className={`admin-search-select${open ? ' is-open' : ''}`}
        ref={rootRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          id="event-service-search"
          type="text"
          name="club-service-query"
          autoComplete="off"
          className="admin-search-select__input"
          value={query}
          disabled={creating}
          placeholder="Buscar o crear un servicio…"
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            inputRef.current?.focus()
            setOpen(true)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setAskPrice(false)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              setQuery('')
              setPrecio('')
              setAskPrice(false)
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              if (matches[0]) add(matches[0].id)
            }
          }}
        />
        {open ? (
          <ul className="admin-search-select__list" role="listbox">
            {!needle ? (
              <li className="admin-search-select__empty">Escribe para buscar un servicio.</li>
            ) : null}
            {needle && matches.length === 0 && !canOfferCreate ? (
              <li className="admin-search-select__empty">Ningún servicio coincide.</li>
            ) : null}
            {matches.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="admin-search-select__option admin-service-picks__option"
                  role="option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(item.id)}
                >
                  <ServiceThumb item={item} />
                  <span>
                    {item.nombre}
                    <small>{formatPrice(item.precio)}</small>
                  </span>
                </button>
              </li>
            ))}
            {canOfferCreate ? (
              <li className="admin-service-picks__create">
                {askPrice ? (
                  <>
                    <p>Precio de «{query.trim()}»</p>
                    <label>
                      Precio
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={precio}
                        disabled={creating}
                        placeholder="0"
                        onChange={(event) => setPrecio(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void createService()
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="app-panel__btn--primary"
                      disabled={creating}
                      onClick={() => void createService()}
                    >
                      Crear y agregar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="admin-search-select__option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setAskPrice(true)}
                  >
                    Crear «{query.trim()}»
                  </button>
                )}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
