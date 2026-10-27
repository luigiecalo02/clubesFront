import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { AdminIcon } from '../../admin/AdminIcon'

type InviteLinkQrProps = {
  url: string
  fileName?: string
}

export function inviteQrFileName(clubName?: string | null): string {
  const slug =
    (clubName || 'club')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'club'

  return `inscripcion-${slug}.png`
}

export function InviteLinkQr({ url, fileName = 'enlace-inscripcion.png' }: InviteLinkQrProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    QRCode.toDataURL(url, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#ffffff' },
    })
      .then((next) => {
        if (!cancelled) setSrc(next)
      })
      .catch(() => {
        if (!cancelled) setSrc(null)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  function download() {
    if (!src) return
    const link = document.createElement('a')
    link.href = src
    link.download = fileName
    link.click()
  }

  if (!src) return <p className="app-panel__muted">Preparando el código QR…</p>

  return (
    <div className="admin-club__invite-qr">
      <img src={src} alt="Código QR del enlace de inscripción" />
      <p className="app-panel__muted">Escanea para abrir el formulario de crear cuenta.</p>
      <button type="button" className="app-panel__btn--ghost" onClick={download}>
        <AdminIcon name="download" />
        Descargar QR
      </button>
    </div>
  )
}
