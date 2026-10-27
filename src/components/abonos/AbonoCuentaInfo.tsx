import { useState } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
import type { CuentaBancariaClub } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import { AppPanel } from '../../theme/AppPanel'
import '../../theme/abonos.css'

function tipoLabel(tipo?: string | null): string {
  if (tipo === 'corriente') return 'Corriente'
  if (tipo === 'ahorros') return 'Ahorros'
  return tipo?.trim() || 'Cuenta'
}

function qrFileName(banco: string, url: string): string {
  const slug =
    banco
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cuenta'
  const fromUrl = url.match(/\.(png|jpe?g|webp)(?:\?|$)/i)?.[1]?.toLowerCase()
  const ext = fromUrl === 'jpeg' ? 'jpg' : fromUrl || 'png'
  return `qr-${slug}.${ext}`
}

function triggerDownload(href: string, fileName: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
}

type AbonoCuentaInfoProps = {
  cuenta?: CuentaBancariaClub | null
  compact?: boolean
}

export function AbonoCuentaInfo({ cuenta, compact = false }: AbonoCuentaInfoProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  if (!cuenta) return null

  const banco = cuenta.banco?.trim() || cuenta.nombre?.trim() || 'Cuenta bancaria'
  const titular = cuenta.titular?.trim() || ''
  const numero = cuenta.numero_cuenta?.trim() || ''
  const doc = cuenta.identificacion_titular?.trim() || ''
  const qr = resolveFileUrl(cuenta.qr_url)

  async function copyNumero() {
    if (!numero) return
    try {
      await navigator.clipboard.writeText(numero)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  async function downloadQr() {
    if (!qr || downloading) return
    const fileName = qrFileName(banco, qr)
    setDownloading(true)
    try {
      const response = await fetch(qr)
      if (!response.ok) throw new Error('qr')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      triggerDownload(objectUrl, fileName)
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch {
      triggerDownload(qr, fileName)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <AppPanel
      as="aside"
      shine={false}
      className={`abono-cuenta${compact ? ' abono-cuenta--compact' : ''}${qr ? ' abono-cuenta--with-qr' : ''}`}
    >
      <p className="app-panel__kicker">Cuenta para consignar</p>
      <h2 className="app-panel__title">{banco}</h2>
      <p className="app-panel__subtitle">
        {qr
          ? 'Copia el número o descarga el QR para pagar desde tu banco.'
          : 'Usa estos datos para consignar el abono.'}
      </p>
      <div className="abono-cuenta__body">
        {qr ? (
          <figure className="abono-cuenta__qr-wrap">
            <img className="abono-cuenta__qr" src={qr} alt={`QR de ${banco}`} />
            <figcaption className="app-panel__muted">Escanea este QR para consignar</figcaption>
            <button
              type="button"
              className="app-panel__btn--ghost"
              disabled={downloading}
              onClick={() => void downloadQr()}
            >
              <AdminIcon name="download" />
              {downloading ? 'Descargando…' : 'Descargar QR'}
            </button>
          </figure>
        ) : null}
        <div className="abono-cuenta__facts">
          {numero ? (
            <p className="abono-cuenta__number">
              <span className="app-panel__muted">Número de cuenta</span>
              <strong>{numero}</strong>
              <button type="button" className="app-panel__btn--ghost" onClick={() => void copyNumero()}>
                {copied ? 'Copiado' : 'Copiar número'}
              </button>
            </p>
          ) : null}
          <dl className="abono-cuenta__rows">
            <div>
              <dt>Tipo</dt>
              <dd>{tipoLabel(cuenta.tipo_cuenta)}</dd>
            </div>
            {titular ? (
              <div>
                <dt>Titular</dt>
                <dd>{titular}</dd>
              </div>
            ) : null}
            {doc ? (
              <div>
                <dt>Documento</dt>
                <dd>{doc}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </AppPanel>
  )
}
