import { resolveFileUrl } from '../../api/baseUrl'
import type { CuentaBancariaClub } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import '../../theme/abonos.css'

function tipoLabel(tipo?: string | null): string {
  if (tipo === 'corriente') return 'Corriente'
  if (tipo === 'ahorros') return 'Ahorros'
  return tipo?.trim() || 'Cuenta'
}

type AbonoCuentaInfoProps = {
  cuenta?: CuentaBancariaClub | null
  compact?: boolean
}

export function AbonoCuentaInfo({ cuenta, compact = false }: AbonoCuentaInfoProps) {
  if (!cuenta) return null

  const banco = cuenta.banco?.trim() || cuenta.nombre?.trim() || 'Cuenta bancaria'
  const titular = cuenta.titular?.trim() || ''
  const numero = cuenta.numero_cuenta?.trim() || ''
  const doc = cuenta.identificacion_titular?.trim() || ''
  const qr = resolveFileUrl(cuenta.qr_url)

  return (
    <aside className={`abono-cuenta${compact ? ' abono-cuenta--compact' : ''}`}>
      <p className="abono-cuenta__kicker">
        <AdminIcon name="wallet" />
        Cuenta para abonar
      </p>
      <p className="abono-cuenta__bank">{banco}</p>
      <dl className="abono-cuenta__grid">
        <div>
          <dt>Tipo</dt>
          <dd>{tipoLabel(cuenta.tipo_cuenta)}</dd>
        </div>
        {numero ? (
          <div>
            <dt>Número</dt>
            <dd>{numero}</dd>
          </div>
        ) : null}
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
      {qr ? <img className="abono-cuenta__qr" src={qr} alt={`QR de ${banco}`} /> : null}
    </aside>
  )
}
