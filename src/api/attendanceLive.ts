import type { AttendanceRanking } from './types'

const WINDOW_EVENT = 'clubes-attendance-changed'
const CHANNEL_NAME = 'clubes-attendance'

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

export function notifyAttendanceChanged(): void {
  window.dispatchEvent(new Event(WINDOW_EVENT))
  liveChannel()?.postMessage({ type: 'changed', at: Date.now() })
}

export function subscribeAttendanceChanged(onChange: () => void): () => void {
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

export function isSameRanking(current: AttendanceRanking | null, next: AttendanceRanking): boolean {
  if (!current) return false
  if (current.eventos !== next.eventos || current.integrantes.length !== next.integrantes.length) {
    return false
  }
  return current.integrantes.every((row, index) => {
    const other = next.integrantes[index]
    return (
      row.persona_id === other.persona_id &&
      row.presentes === other.presentes &&
      (row.puntuales ?? 0) === (other.puntuales ?? 0) &&
      row.justificados === other.justificados &&
      row.porcentaje === other.porcentaje
    )
  })
}
