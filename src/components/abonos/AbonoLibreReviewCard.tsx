import { useState } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
import type { AbonoMovimiento } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import { ImagePreviewDialog } from '../../theme/ImagePreviewDialog'
import { NumberPadInput } from '../../theme/NumberPad'
import { abonoEstadoLabel } from './AbonoProofReview'
import '../../theme/abonos.css'

type AbonoLibreReviewCardProps = {
  abono: AbonoMovimiento
  canReview?: boolean
  formatDate: (value: string) => string
  formatPrice: (value: number) => string
  onReview?: (abono: AbonoMovimiento, estado: 'aprobado' | 'rechazado', monto?: number) => Promise<void>
}

function suggestedMonto(abono: AbonoMovimiento): string {
  return Number(abono.monto) > 0 ? String(Math.round(Number(abono.monto))) : ''
}

export function AbonoLibreReviewCard({
  abono,
  canReview = false,
  formatDate,
  formatPrice,
  onReview,
}: AbonoLibreReviewCardProps) {
  const [monto, setMonto] = useState(suggestedMonto(abono))
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const shot = resolveFileUrl(abono.comprobante_url)
  const pending = abono.estado === 'pendiente'
  const showReview = pending && canReview && Boolean(onReview)
  const estado = abonoEstadoLabel(abono) || 'Pendiente'
  const confirmed = Number(monto)
  const canApprove = !saving && Number.isFinite(confirmed) && confirmed > 0
  const title = abono.producto_nombre || 'Abono libre'
  const note = abono.nota?.trim() || ''

  async function send(estadoNext: 'aprobado' | 'rechazado') {
    if (!onReview || saving || !pending) return
    if (estadoNext === 'aprobado' && !canApprove) return
    setSaving(true)
    try {
      await onReview(abono, estadoNext, estadoNext === 'aprobado' ? confirmed : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="abonos-libre-card">
      <header className="abonos-libre-card__head">
        <div className="abonos-libre-card__identity">
          <span className="abonos-libre-card__badge-icon" aria-hidden="true">
            <AdminIcon name="wallet" />
          </span>
          <span className="abonos-libre-card__titles">
            <strong>{title}</strong>
            {note ? <small>{note}</small> : null}
          </span>
        </div>
        <span className="abonos-libre-card__date">
          <AdminIcon name="calendar" />
          {abono.created_at ? formatDate(abono.created_at) : '—'}
        </span>
        <span className={`abonos-libre-card__estado is-${abono.estado || 'pendiente'}`}>
          <AdminIcon name="clock" />
          {estado}
        </span>
      </header>

      <div className="abonos-libre-card__body">
        <div className="abonos-libre-card__value">
          <span>Valor del abono</span>
          <strong>{formatPrice(abono.monto)}</strong>
        </div>

        {showReview ? (
          <label className="abonos-libre-card__confirm">
            <span>Monto a confirmar</span>
            <NumberPadInput
              title="Monto a confirmar"
              min={1}
              maxDigits={9}
              format={formatPrice}
              ariaLabel="Monto a confirmar"
              className="abonos-libre-card__confirm-input"
              value={monto}
              disabled={saving}
              onChange={setMonto}
            />
          </label>
        ) : null}

        <div className="abonos-libre-card__actions">
          {shot ? (
            <button
              type="button"
              className="abonos-libre-card__icon-btn"
              aria-label="Ver abono"
              title="Ver abono"
              onClick={() => setPreview(true)}
            >
              <AdminIcon name="eye" />
            </button>
          ) : null}
          {showReview ? (
            <>
              <button
                type="button"
                className="abonos-libre-card__icon-btn is-reject"
                aria-label="Rechazar"
                title="Rechazar"
                disabled={saving}
                onClick={() => void send('rechazado')}
              >
                <AdminIcon name="x" />
              </button>
              <button
                type="button"
                className="app-panel__btn--primary abonos-libre-card__approve"
                disabled={!canApprove}
                onClick={() => void send('aprobado')}
              >
                <AdminIcon name="check" />
                Aprobar
              </button>
            </>
          ) : null}
        </div>
      </div>

      {preview && shot ? (
        <ImagePreviewDialog src={shot} alt="Pantallazo del abono" onClose={() => setPreview(false)} />
      ) : null}
    </li>
  )
}
