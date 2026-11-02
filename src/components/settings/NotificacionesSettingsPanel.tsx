import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { notificationsApi, type ClubNotificationSetting } from '../../api/notifications'
import { AppPanel } from '../../theme/AppPanel'
import { useNotice } from '../../theme/NoticeProvider'

type NotificacionesSettingsPanelProps = {
  canUpdate: boolean
}

export function NotificacionesSettingsPanel({ canUpdate }: NotificacionesSettingsPanelProps) {
  const notices = useNotice()
  const [items, setItems] = useState<ClubNotificationSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    notificationsApi
      .settings()
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar el catálogo de notificaciones'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [notices])

  async function onToggle(item: ClubNotificationSetting) {
    if (!canUpdate) return
    setSaving(item.tipo)
    try {
      const next = await notificationsApi.updateSetting(item.tipo, !item.activo)
      setItems((current) => current.map((row) => (row.tipo === next.tipo ? next : row)))
      notices.success(next.activo ? `${next.label} activada.` : `${next.label} desactivada.`)
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo actualizar el tipo'))
    } finally {
      setSaving(null)
    }
  }

  return (
    <AppPanel>
      <p className="app-panel__kicker">Alertas del club</p>
      <h2 className="app-panel__title">Notificaciones</h2>
      <p className="app-panel__subtitle">
        Activa o desactiva los avisos automáticos para los integrantes. Si un tipo no tiene fila guardada,
        cuenta como activo.
      </p>
      {loading ? <p className="app-panel__muted">Cargando…</p> : null}
      {!loading && items.length === 0 ? (
        <p className="app-panel__muted">No hay tipos de notificación configurados.</p>
      ) : null}
      <div className="admin-settings-toggles">
        {items.map((item) => (
          <article key={item.tipo} className="admin-settings-toggle">
            <div>
              <strong>{item.label}</strong>
              <p className="app-panel__muted">{item.description}</p>
            </div>
            <button
              type="button"
              className={item.activo ? 'app-panel__btn--primary' : 'app-panel__btn--ghost'}
              disabled={!canUpdate || saving === item.tipo}
              aria-pressed={item.activo}
              onClick={() => void onToggle(item)}
            >
              {saving === item.tipo ? '…' : item.activo ? 'Activa' : 'Apagada'}
            </button>
          </article>
        ))}
      </div>
    </AppPanel>
  )
}
