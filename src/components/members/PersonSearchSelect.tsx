import { useEffect, useMemo, useRef, useState } from 'react'

export type PersonSearchOption = {
  id: number
  label: string
  disabled?: boolean
}

type PersonSearchSelectProps = {
  value: number | ''
  options: PersonSearchOption[]
  disabled?: boolean
  emptyLabel?: string
  placeholder?: string
  onChange: (value: string) => void
}

export function PersonSearchSelect({
  value,
  options,
  disabled = false,
  emptyLabel = 'Sin asignar',
  placeholder = 'Buscar integrante…',
  onChange,
}: PersonSearchSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = options.find((option) => option.id === Number(value))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => option.label.toLowerCase().includes(q))
  }, [options, query])

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

  function choose(next: string) {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className={`admin-search-select${open ? ' is-open' : ''}`} ref={rootRef}>
      {open ? (
        <input
          ref={inputRef}
          className="admin-search-select__input"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
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
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={false}
          onClick={() => {
            if (disabled) return
            setOpen(true)
          }}
        >
          {selected?.label || emptyLabel}
        </button>
      )}
      {open ? (
        <ul className="admin-search-select__list" role="listbox">
          <li>
            <button
              type="button"
              className={`admin-search-select__option${!value ? ' is-on' : ''}`}
              role="option"
              aria-selected={!value}
              onClick={() => choose('')}
            >
              {emptyLabel}
            </button>
          </li>
          {filtered.length ? (
            filtered.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className={`admin-search-select__option${option.id === Number(value) ? ' is-on' : ''}`}
                  role="option"
                  aria-selected={option.id === Number(value)}
                  disabled={option.disabled && option.id !== Number(value)}
                  onClick={() => choose(String(option.id))}
                >
                  {option.label}
                </button>
              </li>
            ))
          ) : (
            <li className="admin-search-select__empty">Ningún integrante coincide.</li>
          )}
        </ul>
      ) : null}
    </div>
  )
}
