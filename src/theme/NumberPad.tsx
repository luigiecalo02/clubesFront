import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AppPanel } from './AppPanel'
import { lockBodyScroll, unlockBodyScroll } from './bodyScrollLock'
import './number-pad.css'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

function tapHaptic(ms = 12) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  if (typeof window !== 'undefined' && !window.matchMedia('(pointer: coarse)').matches) return
  try {
    navigator.vibrate(ms)
  } catch {
    /* el navegador no permite vibrar */
  }
}

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
  const onConfirmRef = useRef(onConfirm)
  onCloseRef.current = onClose
  onConfirmRef.current = onConfirm
  const amount = Number(draft) || 0
  const amountRef = useRef(amount)
  amountRef.current = amount

  useEffect(() => {
    lockBodyScroll()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Enter') return
      event.preventDefault()
      event.stopPropagation()
      tapHaptic(24)
      onConfirmRef.current(amountRef.current)
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      unlockBodyScroll()
    }
  }, [])

  function typeDigit(digit: string) {
    setDraft((current) => (current === '0' ? digit : `${current}${digit}`).slice(0, maxDigits))
  }

  function pressKey(action: () => void, ms = 12) {
    tapHaptic(ms)
    action()
  }

  return createPortal(
    <div className="number-pad" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Teclado numérico'}>
      <button type="button" className="number-pad__backdrop" aria-label="Cerrar" onClick={onClose} />
      <AppPanel shine={false} className="number-pad__panel">
        <p className="app-panel__kicker">{title}</p>
        <strong className="number-pad__readout">{format ? format(amount) : draft}</strong>
        <div className="number-pad__keys">
          {DIGITS.map((digit) => (
            <button key={digit} type="button" onClick={() => pressKey(() => typeDigit(digit))}>
              {digit}
            </button>
          ))}
          <button type="button" className="is-clear" onClick={() => pressKey(() => setDraft('0'), 18)}>
            Borrar
          </button>
          <button type="button" onClick={() => pressKey(() => typeDigit('0'))}>
            0
          </button>
          <button type="button" className="is-enter" onClick={() => pressKey(() => onConfirm(amount), 24)}>
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
  const amount = Number(value) || 0
  const display = format ? (value === '' || value == null ? '' : format(amount)) : value
  const tooLow = min != null && amount < min

  return (
    <>
      <input
        type={format ? 'text' : 'number'}
        min={format ? undefined : min}
        step={format ? undefined : 1}
        inputMode="none"
        readOnly={Boolean(format)}
        className={className}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        required={required}
        value={display}
        disabled={disabled}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (!disabled) setOpen(true)
          }
        }}
        onChange={format ? undefined : (event) => onChange(event.target.value)}
      />
      {required && format ? (
        <input
          type="text"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={tooLow || value === '' ? '' : value}
          onChange={() => undefined}
        />
      ) : null}
      {open && !disabled ? (
        <NumberPadDialog
          title={title}
          value={value}
          maxDigits={maxDigits}
          format={format}
          onClose={() => setOpen(false)}
          onConfirm={(next) => {
            onChange(next > 0 ? String(next) : min === 0 ? '0' : '')
            setOpen(false)
          }}
        />
      ) : null}
    </>
  )
}
