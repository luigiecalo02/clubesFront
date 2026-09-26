import { useEffect, useMemo, useRef, useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { resolveFileUrl } from '../../api/baseUrl'
import { serviciosApi } from '../../api/servicios'
import type { ClubIcono, ClubServicio } from '../../api/types'
import { CatalogIcon } from './CatalogIcon'
import { findClubIcon, groupClubIcons, matchesClubIcon } from './iconCatalog'

let iconosCache: Promise<ClubIcono[]> | null = null

function loadClubIconos(): Promise<ClubIcono[]> {
  iconosCache = serviciosApi.iconos().catch((error) => {
    iconosCache = null
    throw error
  })
  return iconosCache
}

export function ServiceThumb({ item }: { item: Pick<ClubServicio, 'nombre' | 'image_url' | 'icono'> }) {
  const photo = resolveFileUrl(item.image_url)
  if (photo) {
    return <img src={photo} alt="" className="admin-service-thumb" />
  }
  if (item.icono) {
    return (
      <span className="admin-service-thumb admin-service-thumb--icon" aria-hidden="true">
        <CatalogIcon value={item.icono} />
      </span>
    )
  }
  return (
    <span className="admin-service-thumb admin-service-thumb--empty" aria-hidden="true">
      {item.nombre.slice(0, 1).toUpperCase()}
    </span>
  )
}

type ServiceIconPickerProps = {
  value: string
  onChange: (icono: string) => void
}

export function ServiceIconPicker({ value, onChange }: ServiceIconPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState<ClubIcono[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadClubIconos()
      .then((next) => {
        if (!cancelled) {
          setIcons(next)
          setError('')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudieron cargar los íconos'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = findClubIcon(icons, value)

  const grouped = useMemo(() => {
    const visible = icons.filter((icon) => matchesClubIcon(icon, query))
    return groupClubIcons(visible)
  }, [icons, query])

  useEffect(() => {
    if (!open) return undefined
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

  function choose(next: string) {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="admin-service-icon-select">
      <span className="app-panel__label">Ícono</span>
      <div className={`admin-search-select${open ? ' is-open' : ''}`} ref={rootRef}>
        <button
          type="button"
          className="admin-search-select__trigger admin-service-icon-select__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {selected || value ? (
            <>
              <CatalogIcon value={selected?.valor ?? value} url={selected?.url} tipo={selected?.tipo} />
              {selected?.nombre ?? value}
            </>
          ) : (
            'Elegir ícono'
          )}
        </button>
        {open ? (
          <div className="admin-search-select__list admin-service-icon-select__list">
            <input
              ref={inputRef}
              className="admin-search-select__input admin-service-icon-select__search"
              value={query}
              placeholder="Buscar por nombre…"
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
            <ul role="listbox" aria-label="Íconos">
              <li>
                <button
                  type="button"
                  className={`admin-search-select__option${!value ? ' is-on' : ''}`}
                  role="option"
                  aria-selected={!value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose('')}
                >
                  Sin ícono
                </button>
              </li>
              {loading ? <li className="admin-search-select__empty">Cargando íconos…</li> : null}
              {error ? <li className="admin-search-select__empty">{error}</li> : null}
              {!loading && !error && grouped.length === 0 ? (
                <li className="admin-search-select__empty">Ningún ícono coincide.</li>
              ) : null}
              {grouped.map((group) => (
                <li key={group.key} className="admin-service-icon-select__group">
                  <p className="admin-service-icon-select__group-label">{group.label}</p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`admin-search-select__option admin-service-icon-select__option${
                            value === item.valor ? ' is-on' : ''
                          }`}
                          role="option"
                          aria-selected={value === item.valor}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => choose(item.valor)}
                        >
                          <CatalogIcon value={item.valor} url={item.url} tipo={item.tipo} />
                          {item.nombre}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
