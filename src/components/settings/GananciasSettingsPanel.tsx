import { useEffect, useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { settingsApi } from '../../api/settings'
import type { GananciaDistribucion } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'
import { CreateDrawer } from '../../theme/CreateDrawer'
import { useNotice } from '../../theme/NoticeProvider'

type GananciasSettingsPanelProps = {
  canUpdate: boolean
}

type DistForm = {
  nombre: string
  club: string
  miembros: string
  extras: string
  es_predeterminada: boolean
}

const emptyForm = (): DistForm => ({
  nombre: '',
  club: '50',
  miembros: '30',
  extras: '20',
  es_predeterminada: false,
})

function toPercent(value: string): number {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function formatPercent(value: number): string {
  return `${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%`
}

export function GananciasSettingsPanel({ canUpdate }: GananciasSettingsPanelProps) {
  const notices = useNotice()
  const [items, setItems] = useState<GananciaDistribucion[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<GananciaDistribucion | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const total = toPercent(form.club) + toPercent(form.miembros) + toPercent(form.extras)
  const totalOk = Math.abs(total - 100) < 0.01

  async function loadItems() {
    const next = await settingsApi.ganancias()
    setItems(next)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    settingsApi
      .ganancias()
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar las distribuciones'))
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

  function openEdit(item: GananciaDistribucion) {
    setEditing(item)
    setForm({
      nombre: item.nombre,
      club: String(item.club),
      miembros: String(item.miembros),
      extras: String(item.extras),
      es_predeterminada: item.es_predeterminada,
    })
    setOpen(true)
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!canUpdate || !totalOk || !form.nombre.trim()) return
    setSubmitting(true)
    const payload = {
      nombre: form.nombre.trim(),
      club: toPercent(form.club),
      miembros: toPercent(form.miembros),
      extras: toPercent(form.extras),
      es_predeterminada: form.es_predeterminada,
    }
    try {
      if (editing) {
        await settingsApi.updateGanancia(editing.id, payload)
        notices.success('Distribución actualizada.')
      } else {
        await settingsApi.createGanancia(payload)
        notices.success('Distribución creada.')
      }
      await loadItems()
      closeDrawer()
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo guardar la distribución'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete(item: GananciaDistribucion) {
    if (!canUpdate) return
    if (!window.confirm(`¿Borrar “${item.nombre}”?`)) return
    try {
      await settingsApi.deleteGanancia(item.id)
      notices.success('Distribución eliminada.')
      await loadItems()
      if (editing?.id === item.id) closeDrawer()
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo borrar la distribución'))
    }
  }

  return (
    <>
      {canUpdate ? (
        <button
          type="button"
          className={`admin-fab${open ? ' is-open' : ''}`}
          aria-label={open ? 'Cerrar formulario' : 'Crear distribución'}
          title={open ? 'Cerrar formulario' : 'Crear distribución'}
          onClick={() => (open ? closeDrawer() : openCreate())}
        >
          <span aria-hidden="true">{open ? '×' : '+'}</span>
        </button>
      ) : null}

      <CreateDrawer
        open={open}
        title={editing ? editing.nombre : 'Nueva distribución'}
        subtitle="Ganancias"
        onClose={closeDrawer}
        footer={
          canUpdate ? (
            <button
              type="submit"
              form="ganancia-form"
              className="app-panel__btn--primary"
              disabled={submitting || !totalOk || !form.nombre.trim()}
            >
              {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear distribución'}
            </button>
          ) : null
        }
      >
        <form id="ganancia-form" className="admin-form" onSubmit={onSave}>
          <label>
            Nombre
            <input
              value={form.nombre}
              required
              maxLength={255}
              disabled={!canUpdate}
              placeholder="Distribución normal"
              onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
            />
          </label>
          <label>
            Club
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              required
              disabled={!canUpdate}
              value={form.club}
              onChange={(event) => setForm((current) => ({ ...current, club: event.target.value }))}
            />
          </label>
          <label>
            Miembros
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              required
              disabled={!canUpdate}
              value={form.miembros}
              onChange={(event) => setForm((current) => ({ ...current, miembros: event.target.value }))}
            />
          </label>
          <label>
            Extras
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              required
              disabled={!canUpdate}
              value={form.extras}
              onChange={(event) => setForm((current) => ({ ...current, extras: event.target.value }))}
            />
          </label>
          <p className={totalOk ? 'app-panel__ok' : 'app-panel__alert'}>
            Total {formatPercent(total)}. {totalOk ? 'Suma 100%.' : 'Debe sumar 100%.'}
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
      </CreateDrawer>

      {loading ? <p className="admin-empty">Cargando distribuciones…</p> : null}

      {!loading && items.length === 0 ? (
        <AppPanel className="admin-events__empty" narrow>
          <p className="app-panel__kicker">Ganancias</p>
          <h2 className="app-panel__title">No hay distribuciones</h2>
          <p className="app-panel__subtitle">
            {canUpdate
              ? 'Crea una plantilla con Club, Miembros y Extras. Los tres ítems son fijos; solo cambian los porcentajes.'
              : 'Cuando el director registre una distribución aparecerá aquí.'}
          </p>
        </AppPanel>
      ) : null}

      {!loading && items.length ? (
        <AppPanel shine={false}>
          <p className="app-panel__kicker">Ganancias</p>
          <h2 className="app-panel__title">Distribución de la actividad</h2>
          <p className="app-panel__subtitle">
            Club es interno, miembros va a los integrantes y extras a quienes participan en el evento.
          </p>
          <div className="admin-club__table-wrap">
            <table className="admin-club__table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Club</th>
                  <th>Miembros</th>
                  <th>Extras</th>
                  <th>Uso</th>
                  {canUpdate ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{formatPercent(item.club)}</td>
                    <td>{formatPercent(item.miembros)}</td>
                    <td>{formatPercent(item.extras)}</td>
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
