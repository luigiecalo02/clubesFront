import { useEffect, useState, type FormEvent } from 'react'
import { resolveFileUrl } from '../../api/baseUrl'
import { getApiErrorMessage } from '../../api/client'
import { settingsApi } from '../../api/settings'
import type { CuentaBancariaClub, CuentaBancariaTipo } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'
import { CreateDrawer } from '../../theme/CreateDrawer'
import { ImageUpload } from '../../theme/ImageUpload'
import { useNotice } from '../../theme/NoticeProvider'

type CuentasBancariasSettingsPanelProps = {
  canUpdate: boolean
}

type CuentaForm = {
  banco: string
  tipo_cuenta: CuentaBancariaTipo
  numero_cuenta: string
  titular: string
  identificacion_titular: string
  activo: boolean
  qr: File | null
  removeQr: boolean
}

const emptyForm = (): CuentaForm => ({
  banco: '',
  tipo_cuenta: 'ahorros',
  numero_cuenta: '',
  titular: '',
  identificacion_titular: '',
  activo: true,
  qr: null,
  removeQr: false,
})

function tipoLabel(tipo: string): string {
  if (tipo === 'corriente') return 'Corriente'
  if (tipo === 'ahorros') return 'Ahorros'
  return tipo
}

export function CuentasBancariasSettingsPanel({ canUpdate }: CuentasBancariasSettingsPanelProps) {
  const notices = useNotice()
  const [items, setItems] = useState<CuentaBancariaClub[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CuentaBancariaClub | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)

  async function loadItems() {
    const next = await settingsApi.cuentasBancarias()
    setItems(next)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    settingsApi
      .cuentasBancarias()
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar las cuentas'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [notices])

  function closeDrawer() {
    setOpen(false)
    setEditing(null)
    setForm(emptyForm())
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setOpen(true)
  }

  function openEdit(item: CuentaBancariaClub) {
    setEditing(item)
    setForm({
      banco: item.banco || item.nombre || '',
      tipo_cuenta: item.tipo_cuenta === 'corriente' ? 'corriente' : 'ahorros',
      numero_cuenta: item.numero_cuenta,
      titular: item.titular || '',
      identificacion_titular: item.identificacion_titular || '',
      activo: item.activo,
      qr: null,
      removeQr: false,
    })
    setOpen(true)
  }

  async function syncQr(cuentaId: number) {
    if (form.qr) {
      await settingsApi.uploadCuentaBancariaQr(cuentaId, form.qr)
      return
    }
    if (form.removeQr) {
      await settingsApi.deleteCuentaBancariaQr(cuentaId)
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!canUpdate) return
    if (!form.numero_cuenta.trim() || !form.titular.trim()) {
      notices.warning('Indica el número de cuenta y el nombre del representante.')
      return
    }
    setSubmitting(true)
    const payload = {
      nombre: form.banco.trim() || form.titular.trim(),
      banco: form.banco.trim() || null,
      tipo_cuenta: form.tipo_cuenta,
      numero_cuenta: form.numero_cuenta.trim(),
      titular: form.titular.trim(),
      identificacion_titular: form.identificacion_titular.trim() || null,
      activo: form.activo,
      orden: editing?.orden ?? 0,
    }
    try {
      const saved = editing
        ? await settingsApi.updateCuentaBancaria(editing.id, payload)
        : await settingsApi.createCuentaBancaria(payload)
      await syncQr(saved.id)
      notices.success(editing ? 'Cuenta bancaria actualizada.' : 'Cuenta bancaria creada.')
      await loadItems()
      closeDrawer()
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo guardar la cuenta'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete(item: CuentaBancariaClub) {
    if (!canUpdate) return
    if (!window.confirm(`¿Borrar la cuenta ${item.numero_cuenta}?`)) return
    try {
      await settingsApi.deleteCuentaBancaria(item.id)
      notices.success('Cuenta eliminada.')
      await loadItems()
      if (editing?.id === item.id) closeDrawer()
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo borrar la cuenta'))
    }
  }

  const canSubmit = form.numero_cuenta.trim() !== '' && form.titular.trim() !== ''
  const qrPreview = form.removeQr ? null : resolveFileUrl(editing?.qr_url)

  return (
    <>
      <CreateDrawer
        open={open}
        title={editing ? 'Editar cuenta' : 'Nueva cuenta bancaria'}
        subtitle="Consignación de abonos"
        onClose={closeDrawer}
        footer={
          canUpdate ? (
            <button
              type="submit"
              form="cuenta-bancaria-form"
              className="app-panel__btn--primary"
              disabled={submitting || !canSubmit}
            >
              {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar cuenta'}
            </button>
          ) : null
        }
      >
        <form id="cuenta-bancaria-form" className="admin-form" onSubmit={(event) => void onSave(event)}>
          <ImageUpload
            label="Imagen QR"
            hint="Pantallazo del QR de consignación. JPG, PNG o WebP."
            variant="logo"
            file={form.qr}
            previewUrl={qrPreview}
            emptyText="Sin QR"
            disabled={!canUpdate}
            onSelect={(qr) => setForm((current) => ({ ...current, qr, removeQr: false }))}
            onClear={() => setForm((current) => ({ ...current, qr: null, removeQr: true }))}
          />
          <label>
            Banco / nombre
            <input
              value={form.banco}
              maxLength={160}
              disabled={!canUpdate}
              placeholder="Bancolombia, Nequi…"
              onChange={(event) => setForm((current) => ({ ...current, banco: event.target.value }))}
            />
          </label>
          <label>
            Número de cuenta
            <input
              value={form.numero_cuenta}
              required
              maxLength={64}
              disabled={!canUpdate}
              inputMode="numeric"
              placeholder="0000000000"
              onChange={(event) => setForm((current) => ({ ...current, numero_cuenta: event.target.value }))}
            />
          </label>
          <label>
            Nombre del representante
            <input
              value={form.titular}
              required
              maxLength={160}
              disabled={!canUpdate}
              placeholder="Quién figura como titular"
              onChange={(event) => setForm((current) => ({ ...current, titular: event.target.value }))}
            />
          </label>
          <label>
            Tipo de cuenta
            <select
              value={form.tipo_cuenta}
              disabled={!canUpdate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  tipo_cuenta: event.target.value === 'corriente' ? 'corriente' : 'ahorros',
                }))
              }
            >
              <option value="ahorros">Ahorros</option>
              <option value="corriente">Corriente</option>
            </select>
          </label>
          <label>
            Identificación del titular
            <input
              value={form.identificacion_titular}
              maxLength={32}
              disabled={!canUpdate}
              placeholder="Opcional"
              onChange={(event) =>
                setForm((current) => ({ ...current, identificacion_titular: event.target.value }))
              }
            />
          </label>
          <label className="admin-service-picks__check">
            <input
              type="checkbox"
              checked={form.activo}
              disabled={!canUpdate}
              onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))}
            />
            <span>Cuenta activa para consignaciones</span>
          </label>
        </form>
      </CreateDrawer>

      {loading ? <p className="admin-empty">Cargando cuentas…</p> : null}

      {!loading && items.length === 0 ? (
        <AppPanel className="admin-events__empty" narrow>
          <p className="app-panel__kicker">Cuentas bancarias</p>
          <h2 className="app-panel__title">No hay cuentas</h2>
          <p className="app-panel__subtitle">
            {canUpdate
              ? 'Agrega el número de cuenta, el representante, el tipo y el QR para consignaciones del club.'
              : 'Cuando el director registre una cuenta aparecerá aquí.'}
          </p>
          {canUpdate ? (
            <button type="button" className="app-panel__btn--primary" onClick={openCreate}>
              Agregar cuenta
            </button>
          ) : null}
        </AppPanel>
      ) : null}

      {!loading && items.length ? (
        <AppPanel shine={false}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}
          >
            <div>
              <p className="app-panel__kicker">Cuentas bancarias</p>
              <h2 className="app-panel__title">Cuentas para consignar</h2>
              <p className="app-panel__subtitle">
                Número, representante, tipo y QR. Sirven para abonos por transferencia.
              </p>
            </div>
            {canUpdate ? (
              <button type="button" className="app-panel__btn--primary" onClick={openCreate}>
                Agregar cuenta
              </button>
            ) : null}
          </div>
          <div className="admin-club__table-wrap">
            <table className="admin-club__table">
              <thead>
                <tr>
                  <th>QR</th>
                  <th>Banco</th>
                  <th>Número</th>
                  <th>Representante</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  {canUpdate ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const qr = resolveFileUrl(item.qr_url)
                  return (
                    <tr key={item.id}>
                      <td>
                        {qr ? (
                          <img
                            src={qr}
                            alt={`QR ${item.banco || item.nombre}`}
                            style={{
                              width: '2.5rem',
                              height: '2.5rem',
                              objectFit: 'contain',
                              borderRadius: '0.35rem',
                              background: '#fff',
                            }}
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{item.banco || item.nombre}</td>
                      <td>{item.numero_cuenta}</td>
                      <td>{item.titular || '—'}</td>
                      <td>{tipoLabel(item.tipo_cuenta)}</td>
                      <td>{item.activo ? 'Activa' : 'Inactiva'}</td>
                      {canUpdate ? (
                        <td>
                          <div className="admin-service-actions">
                            <button type="button" className="app-panel__btn--ghost" onClick={() => openEdit(item)}>
                              Editar
                            </button>
                            <button type="button" className="app-panel__btn--ghost" onClick={() => void onDelete(item)}>
                              Borrar
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </AppPanel>
      ) : null}
    </>
  )
}
