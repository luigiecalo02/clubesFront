import { useEffect, useState, type FormEvent } from 'react'
import type { CuentaBancariaClub } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import { compressReceiptImage } from '../../theme/cropImage'
import { DateInput } from '../../theme/DateInput'
import { formatDate, toIsoDate } from '../../theme/dates'
import { NumberPadInput } from '../../theme/NumberPad'
import { AbonoCuentaInfo } from './AbonoCuentaInfo'
import '../../theme/abonos.css'

function formatMoney(value: number): string {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export const ABONO_PAY_METHODS = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Otro'] as const

export type AbonoPayProduct = {
  id: number
  nombre: string
  pendiente?: number
}

export type AbonoPayPartida = {
  producto_servicio_id: number
  monto: number
}

export type AbonoPayDraft = {
  monto: string
  montos: Record<string, string>
  nota: string
  metodo: (typeof ABONO_PAY_METHODS)[number] | ''
  fecha: string
  productoId: string
  comprobante: File | null
}

type AbonoPayFormProps = {
  id?: string
  draft: AbonoPayDraft
  pendiente: number
  products?: AbonoPayProduct[]
  cuenta?: CuentaBancariaClub | null
  saving?: boolean
  showSubmit?: boolean
  onChange: (draft: AbonoPayDraft) => void
  onSubmit: (event: FormEvent) => void
}

export function emptyAbonoPayDraft(): AbonoPayDraft {
  return {
    monto: '',
    montos: {},
    nota: '',
    metodo: '',
    fecha: toIsoDate(new Date()),
    productoId: '',
    comprobante: null,
  }
}

export function composeAbonoNota(draft: AbonoPayDraft): string | undefined {
  const bits = [draft.metodo, formatDate(draft.fecha)].filter(Boolean)
  const text = [bits.join(' · '), draft.nota.trim()].filter(Boolean).join(' — ')
  return text.slice(0, 255) || undefined
}

export function parseAbonoNota(nota?: string | null): { metodo: string; fecha: string; texto: string } {
  if (!nota?.trim()) return { metodo: '', fecha: '', texto: '' }
  const [meta, ...rest] = nota.split(' — ')
  const texto = rest.join(' — ').trim()
  const parts = meta.split(' · ').map((part) => part.trim()).filter(Boolean)
  const methods = ABONO_PAY_METHODS as readonly string[]
  const metodo = parts.find((part) => methods.includes(part)) ?? ''
  const fecha = parts.find((part) => /^\d{2}\/\d{2}\/\d{4}$/.test(part)) ?? ''
  const leftover = parts.filter((part) => part !== metodo && part !== fecha).join(' · ')
  return { metodo, fecha, texto: [leftover, texto].filter(Boolean).join(' — ') }
}

export function abonoPayPartidas(draft: AbonoPayDraft, products: AbonoPayProduct[]): AbonoPayPartida[] {
  if (products.length === 0) return []
  return products.flatMap((product) => {
    const monto = Math.round(Number(draft.montos[String(product.id)]) || 0)
    if (monto <= 0) return []
    return [{ producto_servicio_id: product.id, monto }]
  })
}

export function abonoPayTotal(draft: AbonoPayDraft, products: AbonoPayProduct[]): number {
  if (products.length === 0) return Math.round(Number(draft.monto) || 0)
  return abonoPayPartidas(draft, products).reduce((sum, line) => sum + line.monto, 0)
}

export function AbonoPayForm({
  id = 'abono-pay-form',
  draft,
  pendiente,
  products = [],
  cuenta = null,
  saving = false,
  showSubmit = true,
  onChange,
  onSubmit,
}: AbonoPayFormProps) {
  const locked = saving || pendiente <= 0
  const [preparing, setPreparing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const splitMode = products.length > 0
  const total = abonoPayTotal(draft, products)
  const partidas = abonoPayPartidas(draft, products)

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

  function setProductMonto(productId: number, monto: string) {
    onChange({
      ...draft,
      montos: { ...draft.montos, [String(productId)]: monto },
    })
  }

  function applyProductPercent(product: AbonoPayProduct, percent: number) {
    const base = Math.max(0, Math.min(pendiente, product.pendiente ?? pendiente))
    if (base <= 0) return
    setProductMonto(product.id, String(Math.round((base * percent) / 100)))
  }

  function applyPercent(percent: number) {
    if (pendiente <= 0) return
    onChange({
      ...draft,
      monto: String(Math.round((pendiente * percent) / 100)),
    })
  }

  const canSubmit = !locked && Boolean(draft.metodo) && (splitMode ? partidas.length > 0 : total > 0)

  return (
    <form id={id} className="abonos-pay" onSubmit={onSubmit}>
      <h3>Registrar abono</h3>
      {pendiente > 0 ? <AbonoCuentaInfo cuenta={cuenta} className="is-wide" /> : null}
      <div className="abonos-pay__meta">
        <label>
          Método de pago
          <select
            required
            value={draft.metodo}
            disabled={saving}
            onChange={(event) =>
              onChange({
                ...draft,
                metodo: event.target.value as AbonoPayDraft['metodo'],
              })
            }
          >
            <option value="">Selecciona…</option>
            {ABONO_PAY_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fecha de pago
          <DateInput
            value={draft.fecha}
            onChange={(fecha) => onChange({ ...draft, fecha })}
            disabled={saving}
          />
        </label>
      </div>
      <label>
        Comprobante
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={saving || preparing}
          onChange={(event) => void pickComprobante(event.target.files?.[0] ?? null)}
        />
        <small className="app-panel__muted">
          {splitMode
            ? 'Una sola captura puede cubrir varios productos: indica cuánto va a cada uno.'
            : 'Opcional. Sube el pantallazo si lo tienes.'}
        </small>
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
      {splitMode ? (
        <div className="abonos-pay__splits">
          <p className="abonos-pay__splits-title">Valor por producto</p>
          {products.map((product) => {
            const value = draft.montos[String(product.id)] ?? ''
            const cap = Math.max(0, Math.min(pendiente, product.pendiente ?? pendiente))
            return (
              <div key={product.id} className="abonos-pay__split">
                <span className="abonos-pay__split-name">
                  <strong>{product.nombre}</strong>
                  {product.pendiente != null ? <small>Falta {formatMoney(product.pendiente)}</small> : null}
                </span>
                <span className="abonos-pay__money">
                  <span className="abonos-pay__currency" aria-hidden="true">
                    <AdminIcon name="wallet" />
                  </span>
                  <NumberPadInput
                    title={product.nombre}
                    min={0}
                    maxDigits={9}
                    format={formatMoney}
                    value={value}
                    disabled={locked}
                    onChange={(monto) => setProductMonto(product.id, monto)}
                  />
                </span>
                <span className="abonos-pay__percents" role="group" aria-label={`Porcentaje de ${product.nombre}`}>
                  {[25, 50, 100].map((percent) => (
                    <button
                      key={percent}
                      type="button"
                      className="app-panel__btn--ghost"
                      disabled={locked || cap <= 0}
                      onClick={() => applyProductPercent(product, percent)}
                    >
                      {percent}%
                    </button>
                  ))}
                </span>
              </div>
            )
          })}
          <p className="abonos-pay__splits-total">
            <span>Total de esta captura</span>
            <strong>{formatMoney(total)}</strong>
          </p>
        </div>
      ) : (
        <label className="abonos-pay__amount">
          Valor recibido
          <span className="abonos-pay__money">
            <span className="abonos-pay__currency" aria-hidden="true">
              <AdminIcon name="wallet" />
            </span>
            <NumberPadInput
              title="Valor recibido"
              min={1}
              maxDigits={9}
              format={formatMoney}
              value={draft.monto}
              disabled={locked}
              onChange={(monto) => onChange({ ...draft, monto })}
            />
          </span>
          <span className="abonos-pay__percents" role="group" aria-label="Porcentaje del pendiente">
            {[25, 50, 100].map((percent) => (
              <button
                key={percent}
                type="button"
                className="app-panel__btn--ghost"
                disabled={locked}
                onClick={() => applyPercent(percent)}
              >
                {percent}%
              </button>
            ))}
          </span>
        </label>
      )}
      <label>
        Observación
        <input
          type="text"
          maxLength={180}
          placeholder="Opcional"
          value={draft.nota}
          disabled={saving}
          onChange={(event) => onChange({ ...draft, nota: event.target.value })}
        />
      </label>
      {showSubmit ? (
        <button type="submit" className="app-panel__btn--primary" disabled={!canSubmit}>
          <AdminIcon name="wallet" />
          Registrar abono
        </button>
      ) : null}
    </form>
  )
}
