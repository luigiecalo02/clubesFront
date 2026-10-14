import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AppPanel } from './AppPanel'
import { lockBodyScroll, unlockBodyScroll } from './bodyScrollLock'
import './number-pad.css'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

type NumberPadDialogProps = {
  title: ReactNode
  value: number | string
  maxDigits?: number
  format?: (value: number) => string
  onConfirm: (value: number) => void
  onClose: () => void
}

function initialDraft(value: number | string): string {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  return digits || '0'
}

export function NumberPadDialog({ title, value, maxDigits = 4, format, onConfirm, onClose }: NumberPadDialogProps) {
  const [draft, setDraft] = useState(() => initialDraft(value))
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    lockBodyScroll()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      unlockBodyScroll()
    }
  }, [])

  function typeDigit(digit: string) {
    setDraft((current) => (current === '0' ? digit : `${current}${digit}`).slice(0, maxDigits))
  }

  const amount = Number(draft) || 0

  return createPortal(
    <div className="number-pad" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Teclado numérico'}>
      <button type="button" className="number-pad__backdrop" aria-label="Cerrar" onClick={onClose} />
      <AppPanel shine={false} className="number-pad__panel">
        <p className="app-panel__kicker">{title}</p>
        <strong className="number-pad__readout">{format ? format(amount) : draft}</strong>
        <div className="number-pad__keys">
          {DIGITS.map((digit) => (
            <button key={digit} type="button" onClick={() => typeDigit(digit)}>
              {digit}
            </button>
          ))}
          <button type="button" className="is-clear" onClick={() => setDraft('0')}>
            Borrar
          </button>
          <button type="button" onClick={() => typeDigit('0')}>
            0
          </button>
          <button type="button" className="is-enter" onClick={() => onConfirm(amount)}>
            Enter
          </button>
        </div>
      </AppPanel>
    </div>,
    document.querySelector('.admin-shell') ?? document.body,
  )
}

type NumberPadInputProps = {
  title: ReactNode
  value: string
  maxDigits?: number
  format?: (value: number) => string
  disabled?: boolean
  required?: boolean
  min?: number
  className?: string
  ariaLabel?: string
  onChange: (value: string) => void
}

export function NumberPadInput({
  title,
  value,
  maxDigits,
  format,
  disabled = false,
  required,
  min,
  className,
  ariaLabel,
  onChange,
}: NumberPadInputProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <input
        type="number"
        min={min}
        step={1}
        inputMode="none"
        className={className}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        required={required}
        value={value}
        disabled={disabled}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.currentTarget.form) setOpen(true)
        }}
        onChange={(event) => onChange(event.target.value)}
      />
      {open && !disabled ? (
        <NumberPadDialog
          title={title}
          value={value}
          maxDigits={maxDigits}
          format={format}
          onClose={() => setOpen(false)}
          onConfirm={(next) => {
            onChange(next > 0 ? String(next) : '')
            setOpen(false)
          }}
        />
      ) : null}
    </>
  )
}
