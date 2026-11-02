export type PushUiState = 'unsupported' | 'insecure' | 'needs-install' | 'denied' | 'off' | 'on'

export function isSecurePushContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    isSecurePushContext() &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Motivo legible cuando el push no está disponible en este entorno. */
export function pushBlockReason(): 'insecure' | 'unsupported' | null {
  if (typeof window === 'undefined') return 'unsupported'
  if (!isSecurePushContext()) return 'insecure'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }
  return null
}

export function needsIosInstall(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!isIos) return false
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  return !standalone
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}
