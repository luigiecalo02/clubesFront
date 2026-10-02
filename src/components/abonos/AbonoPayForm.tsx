import type { FormEvent } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import { DateInput } from '../../theme/DateInput'
import { formatDate, toIsoDate } from '../../theme/dates'
import '../../theme/abonos.css'

export const ABONO_PAY_METHODS = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Otro'] as const

export type AbonoPayDraft = {
  monto: string
  nota: string
  metodo: (typeof ABONO_PAY_METHODS)[number] | ''
  fecha: string
}

type AbonoPayFormProps = {
  id?: string
  draft: AbonoPayDraft
  pendiente: number
  saving?: boolean
  showSubmit?: boolean
  onChange: (draft: AbonoPayDraft) => void
  onSubmit: (event: FormEvent) => void
}

export function emptyAbonoPayDraft(): AbonoPayDraft {
  return { monto: '', nota: '', metodo: '', fecha: toIsoDate(new Date()) }
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

export function AbonoPayForm({
  id = 'abono-pay-form',
  draft,
  pendiente,
  saving = false,
  showSubmit = true,
  onChange,
  onSubmit,
}: AbonoPayFormProps) {
  const locked = saving || pendiente <= 0

  function applyPercent(percent: number) {
    if (pendiente <= 0) return
    onChange({
      ...draft,
      monto: String(Math.round((pendiente * percent) / 100)),
    })
  }

  return (
    <form id={id} className="abonos-pay" onSubmit={onSubmit}>
      <h3>Registrar abono</h3>
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
      <label className="abonos-pay__amount">
        Valor recibido
        <span className="abonos-pay__money">
          <span className="abonos-pay__currency" aria-hidden="true">
            <AdminIcon name="wallet" />
          </span>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={draft.monto}
            disabled={locked}
            onChange={(event) => onChange({ ...draft, monto: event.target.value })}
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
      {showSubmit ? (
        <button type="submit" className="app-panel__btn--primary" disabled={locked || !draft.metodo}>
          <AdminIcon name="wallet" />
          Registrar abono
        </button>
      ) : null}
    </form>
  )
}
