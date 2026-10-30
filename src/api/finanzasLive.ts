import type { FinanzasResumen } from './types'

const WINDOW_EVENT = 'clubes-finanzas-changed'
const CHANNEL_NAME = 'clubes-finanzas'

let channel: BroadcastChannel | null | undefined

function liveChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel
  if (typeof BroadcastChannel === 'undefined') {
    channel = null
    return null
  }
  channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

export function notifyFinanzasChanged(): void {
  window.dispatchEvent(new Event(WINDOW_EVENT))
  liveChannel()?.postMessage({ type: 'changed', at: Date.now() })
}

export function subscribeFinanzasChanged(onChange: () => void): () => void {
  function handle() {
    onChange()
  }
  window.addEventListener(WINDOW_EVENT, handle)
  const ch = liveChannel()
  ch?.addEventListener('message', handle)
  return () => {
    window.removeEventListener(WINDOW_EVENT, handle)
    ch?.removeEventListener('message', handle)
  }
}

export function isSameResumen(current: FinanzasResumen | null, next: FinanzasResumen): boolean {
  if (!current) return false
  return fingerprint(current) === fingerprint(next)
}

function fingerprint(data: FinanzasResumen): string {
  return [
    data.kpis.ingresos,
    data.kpis.gastos,
    data.kpis.disponible,
    data.kpis.por_distribuir,
    data.kpis.actividades,
    data.kpis.conceptos_gasto,
    ...data.distribucion.map((part) => `${part.key}:${part.amount}`),
    ...data.cuentas.map((cuenta) => `${cuenta.id}:${cuenta.saldo}`),
    ...data.movimientos.map((mov) => mov.id),
    ...data.actividades.map(
      (act) =>
        `${act.id}:${act.abonado}:${act.capital}:${act.diezmo}:${act.ofrenda}:${act.participantes}:${act.club}:${act.planteado?.diezmo ?? ''}:${act.planteado?.ofrenda ?? ''}:${act.planteado?.capital ?? ''}:${act.planteado?.participantes ?? ''}:${act.planteado?.club ?? ''}:${act.planteado?.extras ?? ''}`,
    ),
    ...data.cuentas_bancarias.map((cuenta) => `${cuenta.id}:${cuenta.saldo ?? 0}`),
  ].join('|')
}
