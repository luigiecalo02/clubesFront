import { useState } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
import type { CuentaBancariaClub } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import { ImagePreviewDialog } from '../../theme/ImagePreviewDialog'
import { SummaryKpi } from '../events/SummaryCards'

type AbonoCuentaInfoProps = {
  cuenta?: CuentaBancariaClub | null
  className?: string
}

export function AbonoCuentaInfo({ cuenta, className }: AbonoCuentaInfoProps) {
  const [preview, setPreview] = useState(false)
  if (!cuenta) return null

  const nombre = cuenta.nombre?.trim() || cuenta.banco?.trim() || 'Cuenta para consignar'
  const numero = cuenta.numero_cuenta?.trim() || ''
  const qr = resolveFileUrl(cuenta.qr_url)

  return (
    <>
      <SummaryKpi
        icon="building"
        tone="info"
        label={nombre}
        value={numero || 'Sin número'}
        className={['is-account', className].filter(Boolean).join(' ')}
      >
        {qr ? (
          <button type="button" className="app-panel__btn--ghost" onClick={() => setPreview(true)}>
            <AdminIcon name="eye" />
            Ver QR
          </button>
        ) : null}
      </SummaryKpi>
      {preview && qr ? (
        <ImagePreviewDialog src={qr} alt={`QR de ${nombre}`} kicker="Código QR" onClose={() => setPreview(false)} />
      ) : null}
    </>
  )
}
