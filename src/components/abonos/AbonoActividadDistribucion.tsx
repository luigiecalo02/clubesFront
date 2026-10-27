import { useEffect, useMemo, useState } from 'react'
import { abonosApi } from '../../api/abonos'
import { getApiErrorMessage } from '../../api/client'
import type { AbonoActividadDistribucion as AbonoActividadDistribucionData } from '../../api/types'
import { useNotice } from '../../theme/NoticeProvider'
import {
  ParticipantIncomeSplit,
  productGainLines,
} from '../events/EventGananciasPanel'
import '../../theme/event-summary.css'

export function AbonoActividadDistribucion({
  eventoId,
  personaId,
}: {
  eventoId: number
  personaId?: number | null
}) {
  const notices = useNotice()
  const [data, setData] = useState<AbonoActividadDistribucionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    abonosApi
      .distribucion(eventoId, personaId)
      .then((next) => {
        if (!cancelled) setData(next)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        notices.error(getApiErrorMessage(err, 'No se pudo cargar el reparto de la actividad'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventoId, notices, personaId])

  const lines = useMemo(
    () => (data ? productGainLines(data.lineas, data.servicios) : []),
    [data],
  )
  const abonosByProduct = useMemo(() => {
    if (!data) return {}
    return Object.fromEntries(
      Object.entries(data.abonos_por_producto).map(([id, monto]) => [Number(id), Number(monto) || 0]),
    )
  }, [data])

  if (loading) return <p className="app-panel__muted">Cargando el reparto de la actividad…</p>
  if (!data) return <p className="app-panel__hint">No se pudo mostrar la distribución de esta actividad.</p>
  if (lines.length === 0 && data.ingreso <= 0) {
    return <p className="app-panel__hint">Todavía no hay ventas ni abonos para repartir en esta actividad.</p>
  }

  return (
    <div className="event-summary__person is-open">
      <ParticipantIncomeSplit
        ingreso={data.ingreso}
        configId={data.ganancia_eclesiastica_id}
        reparto={data.reparto}
        lines={lines}
        abonosByProduct={abonosByProduct}
      />
    </div>
  )
}
