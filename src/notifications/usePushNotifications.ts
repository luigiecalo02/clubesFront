import { useEffect, useState } from 'react'
import { notificationsApi } from '../api/notifications'
import {
  currentPushSubscription,
  isPushSupported,
  needsIosInstall,
  pushBlockReason,
  type PushUiState,
  urlBase64ToUint8Array,
} from './pushSupport'

export function usePushNotifications() {
  const [state, setState] = useState<PushUiState>('unsupported')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (needsIosInstall()) {
      setState('needs-install')
      return
    }
    const blocked = pushBlockReason()
    if (blocked) {
      setState(blocked)
      return
    }
    if (!isPushSupported()) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }
    const subscription = await currentPushSubscription()
    setState(subscription ? 'on' : 'off')
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function enable() {
    setBusy(true)
    setError(null)
    try {
      if (!isPushSupported()) throw new Error('Este dispositivo no admite notificaciones push.')
      if (needsIosInstall()) throw new Error('Instala la app en la pantalla de inicio para activarlas.')

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off')
        throw new Error('No se concedió el permiso de notificaciones.')
      }

      const publicKey = await notificationsApi.vapidKey()
      if (!publicKey) throw new Error('El servidor no tiene configurada la clave VAPID.')

      const registration = await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }))

      await notificationsApi.subscribe(subscription.toJSON())
      setState('on')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron activar las notificaciones.')
      await refresh()
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setError(null)
    try {
      const subscription = await currentPushSubscription()
      if (subscription) {
        await notificationsApi.unsubscribe(subscription.endpoint)
        await subscription.unsubscribe()
      }
      setState('off')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron desactivar las notificaciones.')
      await refresh()
      throw err
    } finally {
      setBusy(false)
    }
  }

  return { state, busy, error, enable, disable, refresh }
}
