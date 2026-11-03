import { useEffect, useState, type FormEvent } from 'react'
import type { CuentaBancariaClub } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import { compressReceiptImage } from '../../theme/cropImage'
import { NumberPadInput } from '../../theme/NumberPad'
import { AbonoCuentaInfo } from './AbonoCuentaInfo'
import '../../theme/abonos.css'

function formatMoney(value: number): string {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export type AbonoLibreDraft = {
  monto: string
  detalle: string
  comprobante: File | null
}

type AbonoLibreFormProps = {
  id?: string
  draft: AbonoLibreDraft
  cuenta?: CuentaBancariaClub | null
  saving?: boolean
  showSubmit?: boolean
  onChange: (draft: AbonoLibreDraft) => void
  onSubmit: (event: FormEvent) => void
}

export function emptyAbonoLibreDraft(): AbonoLibreDraft {
  return {
    monto: '',
    detalle: '',
    comprobante: null,
  }
}

export function AbonoLibreForm({
  id = 'abono-libre-form',
  draft,
  cuenta = null,
  saving = false,
  showSubmit = true,
  onChange,
  onSubmit,
}: AbonoLibreFormProps) {
  const [preparing, setPreparing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const total = Math.round(Number(draft.monto) || 0)
  const canSubmit = !saving && total > 0 && Boolean(draft.comprobante)

  useEffect(() => {
    if (!draft.comprobante) {
      setPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(draft.comprobante)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [draft.comprobante])

  async function pickComprobante(file: File | null) {
    if (!file) {
      onChange({ ...draft, comprobante: null })
      return
    }
    setPreparing(true)
    try {
      onChange({ ...draft, comprobante: await compressReceiptImage(file) })
    } catch {
      onChange({ ...draft, comprobante: file })
    } finally {
      setPreparing(false)
    }
  }

  return (
    <form id={id} className="abonos-pay abonos-pay--libre" onSubmit={onSubmit}>
      <h3>Abono libre</h3>
      <p className="app-panel__muted">
        No está ligado a una actividad. Indica el monto, sube el comprobante y un detalle. Tras la
        aprobación de la directiva, el valor entra neto a tu ganancia en Finanzas.
      </p>
      <AbonoCuentaInfo cuenta={cuenta} className="is-wide" />
      <label className="abonos-pay__amount">
        Monto
        <span className="abonos-pay__money">
          <span className="abonos-pay__currency" aria-hidden="true">
            <AdminIcon name="wallet" />
          </span>
          <NumberPadInput
            title="Monto del abono libre"
            min={1}
            maxDigits={9}
            format={formatMoney}
            value={draft.monto}
            disabled={saving}
            onChange={(monto) => onChange({ ...draft, monto })}
          />
        </span>
      </label>
      <label>
        Detalle / observación
        <input
          type="text"
          maxLength={255}
          placeholder="Ej. donación, ajuste, aporte extra…"
          value={draft.detalle}
          disabled={saving}
          onChange={(event) => onChange({ ...draft, detalle: event.target.value })}
        />
      </label>
      <label>
        Comprobante
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={saving || preparing}
          required
          onChange={(event) => void pickComprobante(event.target.files?.[0] ?? null)}
        />
        <small className="app-panel__muted">Obligatorio. Sube el pantallazo del pago.</small>
      </label>
      {preview ? (
        <div className="abonos-pay__shot">
          <img className="abono-proof__shot" src={preview} alt="Comprobante listo para enviar" />
          <button
            type="button"
            className="app-panel__btn--ghost"
            disabled={saving}
            onClick={() => onChange({ ...draft, comprobante: null })}
          >
            <AdminIcon name="x" />
            Quitar comprobante
          </button>
        </div>
      ) : null}
      {showSubmit ? (
        <button type="submit" className="app-panel__btn--primary" disabled={!canSubmit}>
          <AdminIcon name="wallet" />
          Enviar abono libre
        </button>
      ) : null}
    </form>
  )
}
