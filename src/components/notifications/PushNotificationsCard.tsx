import { AppPanel } from '../../theme/AppPanel'
import { useNotice } from '../../theme/NoticeProvider'
import { usePushNotifications } from '../../notifications/usePushNotifications'

export function PushNotificationsCard() {
  const { state, busy, enable, disable } = usePushNotifications()
  const notices = useNotice()

  async function onToggle() {
    const turningOff = state === 'on'
    try {
      if (turningOff) await disable()
      else await enable()
      notices.success(
        turningOff ? 'Notificaciones desactivadas en este dispositivo.' : 'Notificaciones activadas.',
      )
    } catch (err) {
      notices.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado de las notificaciones')
    }
  }

  const subtitle =
    state === 'insecure'
      ? 'Este origen no es seguro para notificaciones push.'
      : state === 'unsupported'
        ? 'Este navegador no admite notificaciones push.'
        : state === 'needs-install'
          ? 'En iPhone o iPad, agrega Clubes a la pantalla de inicio y ábrela desde ahí.'
          : state === 'denied'
            ? 'El permiso está bloqueado. Actívalo en la configuración del navegador.'
            : 'Recibe avisos de asistencia y abonos aunque la app esté cerrada.'

  return (
    <AppPanel>
      <p className="app-panel__kicker">Alertas</p>
      <h2 className="app-panel__title">Notificaciones en este dispositivo</h2>
      <p className="app-panel__subtitle">{subtitle}</p>
      {state === 'needs-install' || state === 'unsupported' || state === 'insecure' || state === 'denied' ? (
        <p className="app-panel__hint">
          {state === 'needs-install'
            ? 'Safari → Compartir → Agregar a pantalla de inicio.'
            : state === 'denied'
              ? 'Cuando habilites el permiso, vuelve a intentar aquí.'
              : state === 'insecure'
                ? 'Abre la app en http://127.0.0.1:5173 o https:// (no uses IP de red ni el preview interno).'
                : 'Prueba en Chrome, Edge o Firefox actualizados.'}
        </p>
      ) : (
        <div className="admin-form__actions">
          <button
            type="button"
            className={state === 'on' ? 'app-panel__btn--ghost' : 'app-panel__btn--primary'}
            disabled={busy}
            onClick={() => void onToggle()}
          >
            {busy ? 'Guardando…' : state === 'on' ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      )}
    </AppPanel>
  )
}
