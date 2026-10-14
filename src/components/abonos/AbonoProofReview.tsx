import { useState } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
import type { AbonoMovimiento } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import { ImagePreviewDialog } from '../../theme/ImagePreviewDialog'
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

export function abonoEstadoLabel(abono: AbonoMovimiento): string | null {
  if (abono.estado === 'pendiente') return 'Pendiente'
  if (abono.estado === 'rechazado') return 'Rechazado'
  return null
}

type AbonoProofReviewProps = {
  abono: AbonoMovimiento
  canReview?: boolean
  hideShot?: boolean
  onReview?: (abono: AbonoMovimiento, estado: 'aprobado' | 'rechazado', monto?: number) => Promise<void>
}

export function AbonoProofReview({ abono, canReview = false, hideShot = false, onReview }: AbonoProofReviewProps) {
  const [monto, setMonto] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const shot = hideShot ? null : resolveFileUrl(abono.comprobante_url)
  const pending = abono.estado === 'pendiente'
  const showForm = pending && canReview && Boolean(onReview)
  if (!shot && !showForm && abono.estado !== 'rechazado') return null

  async function send(estado: 'aprobado' | 'rechazado') {
    if (!onReview || saving) return
    const value = Number(monto)
    if (estado === 'aprobado' && (!Number.isFinite(value) || value <= 0)) return
    setSaving(true)
    try {
      await onReview(abono, estado, estado === 'aprobado' ? value : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`abono-proof${shot && showForm ? ' is-inline' : ''}`}>
      {shot ? (
        <button type="button" className="abono-proof__open" onClick={() => setPreview(true)}>
          <img className="abono-proof__shot" src={shot} alt="Pantallazo del abono" />
        </button>
      ) : null}
      {pending && !showForm ? <small>Pendiente de aprobación de la directiva.</small> : null}
      {abono.estado === 'rechazado' ? <small>La directiva rechazó este pantallazo.</small> : null}
      {showForm ? (
        <label>
          Valor del pantallazo
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={monto}
            disabled={saving}
            onChange={(event) => setMonto(event.target.value)}
          />
          <span className="abono-proof__actions">
            <button
              type="button"
              className="app-panel__btn--primary"
              disabled={saving || Number(monto) <= 0}
              onClick={() => void send('aprobado')}
            >
              Aprobar
            </button>
            <button
              type="button"
              className="app-panel__btn--ghost"
              disabled={saving}
              onClick={() => void send('rechazado')}
            >
              Rechazar
            </button>
          </span>
        </label>
      ) : null}
      {preview && shot ? (
        <ImagePreviewDialog src={shot} alt="Pantallazo del abono" onClose={() => setPreview(false)} />
      ) : null}
    </div>
  )
}
