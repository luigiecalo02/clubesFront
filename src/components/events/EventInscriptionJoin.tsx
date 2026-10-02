import { useEffect, useState } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
import { getApiErrorMessage } from '../../api/client'
import { inscripcionesApi } from '../../api/inscripciones'
import type { EventSummary } from '../../api/types'
import { CreateDrawer } from '../../theme/CreateDrawer'
import { useNotice } from '../../theme/NoticeProvider'

type EventInscriptionJoinProps = {
  event: EventSummary
  onClose: () => void
  onChanged: (next: EventSummary) => void
}

export function EventInscriptionJoin({ event, onClose, onChanged }: EventInscriptionJoinProps) {
  const notices = useNotice()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inscrito, setInscrito] = useState(Boolean(event.inscrito))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    inscripcionesApi
      .me(event.id)
      .then((next) => {
        if (cancelled) return
        setInscrito(next.inscrito)
        onChanged({ ...event, ...next.evento, inscrito: next.inscrito })
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar tu inscripción'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [event.id])

  async function toggle(next: boolean) {
    setSaving(true)
    try {
      const saved = await inscripcionesApi.join(event.id, next)
      setInscrito(saved.inscrito)
      onChanged({ ...event, ...saved.evento, inscrito: saved.inscrito })
      notices.success(saved.inscrito ? 'Quedaste inscrito.' : 'Ya no estás inscrito.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo actualizar tu inscripción'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <CreateDrawer
      open
      title={event.name}
      subtitle="Inscripción"
      cover={resolveFileUrl(event.banner_url)}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="app-panel__btn--ghost" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="app-panel__btn--primary"
            disabled={loading || saving}
            onClick={() => void toggle(!inscrito)}
          >
            {saving ? 'Guardando…' : inscrito ? 'Cancelar inscripción' : 'Inscribirme'}
          </button>
        </>
      }
    >
      {loading ? <p className="app-panel__muted">Cargando tu inscripción…</p> : null}
      {!loading && inscrito ? (
        <p className="app-panel__ok">Ya estás inscrito en este evento publicado.</p>
      ) : null}
      {!loading && !inscrito ? (
        <p className="app-panel__subtitle">
          Puedes inscribirte tú mismo mientras el evento esté publicado. La directiva también puede
          anotarte desde Inscritos.
        </p>
      ) : null}
    </CreateDrawer>
  )
}
