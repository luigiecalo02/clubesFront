import { useEffect, useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { settingsApi } from '../../api/settings'
import type { GananciaDistribucion, GananciaEclesiastica } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'
import { CreateDrawer } from '../../theme/CreateDrawer'
import { useNotice } from '../../theme/NoticeProvider'

type EclesiasticaSettingsPanelProps = {
  canUpdate: boolean
}

type ChurchForm = {
  nombre: string
  diezmo: string
  ofrenda: string
  distribucion_id: string
  es_predeterminada: boolean
}

const emptyForm = (): ChurchForm => ({
  nombre: '',
  diezmo: '10',
  ofrenda: '10',
  distribucion_id: '',
  es_predeterminada: false,
})

function toPercent(value: string): number {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function formatPercent(value: number): string {
  return `${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%`
}

export function EclesiasticaSettingsPanel({ canUpdate }: EclesiasticaSettingsPanelProps) {
  const notices = useNotice()
  const [items, setItems] = useState<GananciaEclesiastica[]>([])
  const [distribuciones, setDistribuciones] = useState<GananciaDistribucion[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<GananciaEclesiastica | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const churchSum = toPercent(form.diezmo) + toPercent(form.ofrenda)
  const resto = Math.round((100 - churchSum) * 100) / 100
  const totalOk = churchSum <= 100 && resto >= 0
  const selected = distribuciones.find((row) => row.id === Number(form.distribucion_id)) ?? null
  const canCreate = canUpdate && distribuciones.length > 0

  async function loadAll() {
    const [nextItems, nextDist] = await Promise.all([settingsApi.eclesiasticas(), settingsApi.ganancias()])
    setItems(nextItems)
    setDistribuciones(nextDist)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([settingsApi.eclesiasticas(), settingsApi.ganancias()])
      .then(([nextItems, nextDist]) => {
        if (cancelled) return
        setItems(nextItems)
        setDistribuciones(nextDist)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar la configuración eclesiástica'))
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
    const preferred = distribuciones.find((row) => row.es_predeterminada) ?? distribuciones[0]
    setEditing(null)
    setForm({
      ...emptyForm(),
      distribucion_id: preferred ? String(preferred.id) : '',
    })
    setOpen(true)
  }

  function openEdit(item: GananciaEclesiastica) {
    setEditing(item)
    setForm({
      nombre: item.nombre,
      diezmo: String(item.diezmo),
      ofrenda: String(item.ofrenda),
      distribucion_id: String(item.distribucion_id),
      es_predeterminada: item.es_predeterminada,
    })
    setOpen(true)
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!canUpdate || !totalOk || !form.nombre.trim() || !form.distribucion_id) return
    setSubmitting(true)
    const payload = {
      nombre: form.nombre.trim(),
      diezmo: toPercent(form.diezmo),
      ofrenda: toPercent(form.ofrenda),
      distribucion_id: Number(form.distribucion_id),
      es_predeterminada: form.es_predeterminada,
    }
    try {
      if (editing) {
        await settingsApi.updateEclesiastica(editing.id, payload)
        notices.success('Configuración eclesiástica actualizada.')
      } else {
        await settingsApi.createEclesiastica(payload)
        notices.success('Configuración eclesiástica creada.')
      }
      await loadAll()
      closeDrawer()
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo guardar la configuración eclesiástica'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete(item: GananciaEclesiastica) {
    if (!canUpdate) return
    if (!window.confirm(`¿Borrar “${item.nombre}”?`)) return
    try {
      await settingsApi.deleteEclesiastica(item.id)
      notices.success('Configuración eclesiástica eliminada.')
      await loadAll()
      if (editing?.id === item.id) closeDrawer()
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo borrar la configuración eclesiástica'))
    }
  }

  return (
    <>
      {canCreate ? (
        <button
          type="button"
          className={`admin-fab${open ? ' is-open' : ''}`}
          aria-label={open ? 'Cerrar formulario' : 'Crear configuración eclesiástica'}
          title={open ? 'Cerrar formulario' : 'Crear configuración eclesiástica'}
          onClick={() => (open ? closeDrawer() : openCreate())}
        >
          <span aria-hidden="true">{open ? '×' : '+'}</span>
        </button>
      ) : null}

      <CreateDrawer
        open={open}
        title={editing ? editing.nombre : 'Nueva configuración'}
        subtitle="Eclesiástica"
        onClose={closeDrawer}
        footer={
          canUpdate ? (
            <button
              type="submit"
              form="eclesiastica-form"
              className="app-panel__btn--primary"
              disabled={submitting || !totalOk || !form.nombre.trim() || !form.distribucion_id}
            >
              {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear configuración'}
            </button>
          ) : null
        }
      >
        {distribuciones.length === 0 ? (
          <p className="app-panel__hint">
            Primero crea una distribución en la pestaña Ganancias. El resto de la actividad se reparte con ella.
          </p>
        ) : (
          <form id="eclesiastica-form" className="admin-form" onSubmit={onSave}>
            <label>
              Nombre
              <input
                value={form.nombre}
                required
                maxLength={255}
                disabled={!canUpdate}
                placeholder="Eventos especiales"
                onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
              />
            </label>
            <label>
              Diezmo
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                required
                disabled={!canUpdate}
                value={form.diezmo}
                onChange={(event) => setForm((current) => ({ ...current, diezmo: event.target.value }))}
              />
            </label>
            <label>
              Ofrenda
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                required
                disabled={!canUpdate}
                value={form.ofrenda}
                onChange={(event) => setForm((current) => ({ ...current, ofrenda: event.target.value }))}
              />
            </label>
            <label>
              Distribución del resto
              <select
                value={form.distribucion_id}
                required
                disabled={!canUpdate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, distribucion_id: event.target.value }))
                }
              >
                <option value="">Elige una distribución</option>
                {distribuciones.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.nombre}
                    {row.es_predeterminada ? ' · predeterminada' : ''}
                  </option>
                ))}
              </select>
            </label>
            <p className={totalOk ? 'app-panel__ok' : 'app-panel__alert'}>
              Resto {formatPercent(resto)}
              {selected
                ? ` → ${selected.nombre} (club ${formatPercent(selected.club)}, miembros ${formatPercent(selected.miembros)}, extras ${formatPercent(selected.extras)})`
                : '.'}
              {totalOk ? '' : ' Diezmo y ofrenda no pueden pasar de 100%.'}
            </p>
            <label className="admin-service-picks__check">
              <input
                type="checkbox"
                checked={form.es_predeterminada}
                disabled={!canUpdate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, es_predeterminada: event.target.checked }))
                }
              />
              <span>Predeterminada del club</span>
            </label>
          </form>
        )}
      </CreateDrawer>

      {loading ? <p className="admin-empty">Cargando configuración eclesiástica…</p> : null}

      {!loading && items.length === 0 ? (
        <AppPanel className="admin-events__empty" narrow>
          <p className="app-panel__kicker">Eclesiástica</p>
          <h2 className="app-panel__title">No hay configuraciones</h2>
          <p className="app-panel__subtitle">
            {distribuciones.length === 0
              ? 'Crea primero una distribución en Ganancias. Luego podrás armar diezmo, ofrenda y el resto.'
              : canUpdate
                ? 'Crea una configuración como “Eventos especiales”: diezmo, ofrenda y el resto a una distribución.'
                : 'Cuando el director registre una configuración aparecerá aquí.'}
          </p>
        </AppPanel>
      ) : null}

      {!loading && items.length ? (
        <AppPanel shine={false}>
          <p className="app-panel__kicker">Eclesiástica</p>
          <h2 className="app-panel__title">Configuración financiera</h2>
          <p className="app-panel__subtitle">
            Diezmo y ofrenda salen del total. El resto se reparte con la distribución elegida.
          </p>
          <div className="admin-club__table-wrap">
            <table className="admin-club__table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Diezmo</th>
                  <th>Ofrenda</th>
                  <th>Resto</th>
                  <th>Distribución</th>
                  <th>Uso</th>
                  {canUpdate ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{formatPercent(item.diezmo)}</td>
                    <td>{formatPercent(item.ofrenda)}</td>
                    <td>{formatPercent(item.resto)}</td>
                    <td>{item.distribucion?.nombre || '—'}</td>
                    <td>{item.es_predeterminada ? 'Predeterminada' : '—'}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </AppPanel>
      ) : null}
    </>
  )
}
