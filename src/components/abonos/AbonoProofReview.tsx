import { useRef, useState, type FormEvent } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
import type { AbonoMovimiento } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import { compressReceiptImage } from '../../theme/cropImage'
import { ImagePreviewDialog } from '../../theme/ImagePreviewDialog'
import { NumberPadInput } from '../../theme/NumberPad'
import '../../theme/abonos.css'

export function AbonoShotButton({ abono }: { abono: AbonoMovimiento }) {
  const [preview, setPreview] = useState(false)
  const shot = resolveFileUrl(abono.comprobante_url)
  if (!shot) return null

  return (
    <>
      <button
        type="button"
        className="abono-proof__peek"
        aria-label="Ver pantallazo del abono"
        title="Ver pantallazo"
        onClick={() => setPreview(true)}
      >
        <AdminIcon name="eye" />
      </button>
      {preview ? (
        <ImagePreviewDialog src={shot} alt="Pantallazo del abono" onClose={() => setPreview(false)} />
      ) : null}
    </>
  )
}

export function AbonoProofAttachButton({
  disabled = false,
  onAttach,
}: {
  disabled?: boolean
  onAttach?: (file: File) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  if (!onAttach) return null

  async function pick(file: File | null) {
    if (!file || !onAttach || saving) return
    setSaving(true)
    try {
      let compact = file
      try {
        compact = await compressReceiptImage(file)
      } catch {
        compact = file
      }
      await onAttach(compact)
    } finally {
      setSaving(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        disabled={disabled || saving}
        onChange={(event) => void pick(event.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        className="app-panel__btn--ghost abono-amount__edit"
        disabled={disabled || saving}
        aria-label="Adjuntar comprobante"
        title="Adjuntar comprobante"
        onClick={() => inputRef.current?.click()}
      >
        <AdminIcon name="paperclip" />
        {saving ? 'Adjuntando…' : 'Adjuntar'}
      </button>
    </>
  )
}

export function abonoEstadoLabel(abono: AbonoMovimiento): string | null {
  if (abono.estado === 'pendiente') return 'Pendiente'
  if (abono.estado === 'rechazado') return 'Rechazado'
  if (abono.estado === 'eliminado') return 'Eliminado'
  return null
}

type AbonoProofReviewProps = {
  abono?: AbonoMovimiento
  abonos?: AbonoMovimiento[]
  canReview?: boolean
  hideShot?: boolean
  onReview?: (abono: AbonoMovimiento, estado: 'aprobado' | 'rechazado', monto?: number) => Promise<void>
}

function suggestedMonto(abono: AbonoMovimiento): string {
  return Number(abono.monto) > 0 ? String(Math.round(Number(abono.monto))) : ''
}

export function AbonoProofReview({
  abono,
  abonos,
  canReview = false,
  hideShot = false,
  onReview,
}: AbonoProofReviewProps) {
  const items = abonos?.length ? abonos : abono ? [abono] : []
  const pendingItems = items.filter((item) => item.estado === 'pendiente')
  const [montos, setMontos] = useState<Record<number, string>>(() =>
    Object.fromEntries(pendingItems.map((item) => [item.id, suggestedMonto(item)])),
  )
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const shot = hideShot ? null : resolveFileUrl(items[0]?.comprobante_url)
  const showForm = pendingItems.length > 0 && canReview && Boolean(onReview)
  const rejected = items.some((item) => item.estado === 'rechazado')
  if (!items.length || (!shot && !showForm && !rejected)) return null

  async function send(estado: 'aprobado' | 'rechazado') {
    if (!onReview || saving || pendingItems.length === 0) return
    if (estado === 'aprobado') {
      const invalid = pendingItems.some((item) => {
        const value = Number(montos[item.id])
        return !Number.isFinite(value) || value <= 0
      })
      if (invalid) return
    }
    setSaving(true)
    try {
      for (const item of pendingItems) {
        await onReview(item, estado, estado === 'aprobado' ? Number(montos[item.id]) : undefined)
      }
    } finally {
      setSaving(false)
    }
  }

  const canApprove =
    !saving &&
    pendingItems.every((item) => {
      const value = Number(montos[item.id])
      return Number.isFinite(value) && value > 0
    })

  return (
    <div className={`abono-proof${shot && showForm ? ' is-inline' : ''}${pendingItems.length > 1 ? ' is-batch' : ''}`}>
      {shot ? (
        <button type="button" className="abono-proof__open" onClick={() => setPreview(true)}>
          <img className="abono-proof__shot" src={shot} alt="Pantallazo del abono" />
        </button>
      ) : null}
      {pendingItems.length > 0 && !showForm ? (
        <small>
          Pendiente de aprobación de la directiva
          {pendingItems.length > 1
            ? ` · ${pendingItems.length} productos`
            : pendingItems[0]?.producto_nombre
              ? ` · ${pendingItems[0].producto_nombre}`
              : ''}
          {pendingItems.length === 1 && Number(pendingItems[0].monto) > 0
            ? ` · ${formatAbonoMoney(pendingItems[0].monto)}`
            : ''}
          .
        </small>
      ) : null}
      {rejected ? <small>La directiva rechazó este pantallazo.</small> : null}
      {showForm ? (
        <div className="abono-proof__batch">
          <p className="abono-proof__batch-title">
            {pendingItems.length > 1
              ? `Una captura · ${pendingItems.length} abonos`
              : 'Valor del pantallazo'}
          </p>
          {pendingItems.map((item) => (
            <label key={item.id} className="abono-proof__batch-line">
              <span>
                {item.producto_nombre || 'Abono'}
              </span>
              <NumberPadInput
                title={item.producto_nombre || 'Valor del abono'}
                min={1}
                maxDigits={9}
                format={formatAbonoMoney}
                ariaLabel={`Valor de ${item.producto_nombre || 'abono'}`}
                value={montos[item.id] ?? ''}
                disabled={saving}
                onChange={(monto) => setMontos((current) => ({ ...current, [item.id]: monto }))}
              />
            </label>
          ))}
          {pendingItems.length > 1 ? (
            <p className="abono-proof__batch-total">
              <span>Total</span>
              <strong>
                {formatAbonoMoney(
                  pendingItems.reduce((sum, item) => sum + (Number(montos[item.id]) || 0), 0),
                )}
              </strong>
            </p>
          ) : null}
          <span className="abono-proof__actions">
            <button
              type="button"
              className="app-panel__btn--primary"
              disabled={!canApprove}
              onClick={() => void send('aprobado')}
            >
              {pendingItems.length > 1 ? 'Aprobar todos' : 'Aprobar'}
            </button>
            <button
              type="button"
              className="app-panel__btn--ghost"
              disabled={saving}
              onClick={() => void send('rechazado')}
            >
              {pendingItems.length > 1 ? 'Rechazar todos' : 'Rechazar'}
            </button>
          </span>
        </div>
      ) : null}
      {preview && shot ? (
        <ImagePreviewDialog src={shot} alt="Pantallazo del abono" onClose={() => setPreview(false)} />
      ) : null}
    </div>
  )
}

function formatAbonoMoney(value: number): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export function AbonoAmountControl({
  abono,
  canEdit = false,
  canDelete = false,
  onSave,
  onDelete,
}: {
  abono: AbonoMovimiento
  canEdit?: boolean
  canDelete?: boolean
  onSave?: (abono: AbonoMovimiento, monto: number) => Promise<void>
  onDelete?: (abono: AbonoMovimiento) => Promise<void>
}) {
  const estado = abono.estado || 'aprobado'
  const eliminado = estado === 'eliminado'
  const editable =
    canEdit && !eliminado && estado !== 'pendiente' && estado !== 'rechazado' && Boolean(onSave)
  const deletable = canDelete && estado === 'aprobado' && Boolean(onDelete)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  function open() {
    setValue(String(Math.round(Number(abono.monto) || 0)))
    setEditing(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!onSave || saving) return
    const monto = Number(value)
    if (!Number.isFinite(monto) || monto <= 0) return
    setSaving(true)
    try {
      await onSave(abono, monto)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!onDelete || saving) return
    if (!window.confirm('¿Eliminar este abono? Dejará de contar en el recaudo.')) return
    setSaving(true)
    try {
      await onDelete(abono)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (eliminado) {
    return (
      <span className="abono-amount is-eliminado">
        <strong>{formatAbonoMoney(abono.monto)}</strong>
        <small>Eliminado</small>
      </span>
    )
  }

  if (!editing || !editable) {
    return (
      <span className="abono-amount">
        <strong>{formatAbonoMoney(abono.monto)}</strong>
        {editable ? (
          <button type="button" className="app-panel__btn--ghost abono-amount__edit" onClick={open}>
            Cambiar valor
          </button>
        ) : null}
        {deletable ? (
          <button type="button" className="app-panel__btn--ghost abono-amount__edit is-danger" disabled={saving} onClick={() => void remove()}>
            Eliminar
          </button>
        ) : null}
      </span>
    )
  }

  return (
    <form className="abono-amount" onSubmit={(event) => void save(event)}>
      <NumberPadInput
        title="Nuevo valor del abono"
        min={1}
        maxDigits={9}
        format={formatAbonoMoney}
        ariaLabel="Nuevo valor del abono"
        value={value}
        disabled={saving}
        onChange={setValue}
      />
      <button type="submit" className="app-panel__btn--primary abono-amount__edit" disabled={saving || Number(value) <= 0}>
        Guardar
      </button>
      <button type="button" className="app-panel__btn--ghost abono-amount__edit" disabled={saving} onClick={() => setEditing(false)}>
        Cancelar
      </button>
      {deletable ? (
        <button type="button" className="app-panel__btn--ghost abono-amount__edit is-danger" disabled={saving} onClick={() => void remove()}>
          Eliminar
        </button>
      ) : null}
    </form>
  )
}
