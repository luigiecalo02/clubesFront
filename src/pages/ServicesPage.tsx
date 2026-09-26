import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { resolveFileUrl } from '../api/baseUrl'
import { getApiErrorMessage } from '../api/client'
import { serviciosApi } from '../api/servicios'
import type { ClubServicio } from '../api/types'
import { canManageClubServices } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import { AppPanel } from '../theme/AppPanel'
import { CreateDrawer } from '../theme/CreateDrawer'
import { ServiceIconPicker, ServiceThumb } from '../components/services/ServiceVisual'
import { ImageUpload } from '../theme/ImageUpload'
import { useNotice } from '../theme/NoticeProvider'

type VisualKind = 'foto' | 'icono'

const emptyForm = () => ({
  nombre: '',
  descripcion: '',
  precio: '',
  activo: true,
  visual: 'foto' as VisualKind,
  icono: '',
  image: null as File | null,
  removeImage: false,
})

function formatPrice(value: number | string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function formFromServicio(item: ClubServicio) {
  return {
    nombre: item.nombre,
    descripcion: item.descripcion ?? '',
    precio: String(item.precio ?? ''),
    activo: item.activo,
    visual: (item.image_url ? 'foto' : item.icono ? 'icono' : 'foto') as VisualKind,
    icono: item.icono ?? '',
    image: null as File | null,
    removeImage: false,
  }
}

export function ServicesPage() {
  const auth = useAuth()
  const ctx = auth.user?.contexto
  const canManage = canManageClubServices({
    can: auth.can,
    rolName: ctx?.rol_name,
    organizacionId: ctx?.organizacion_id,
  })
  const [items, setItems] = useState<ClubServicio[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ClubServicio | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const notices = useNotice()

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) =>
      [item.nombre, item.descripcion]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    )
  }, [items, query])

  async function loadServices() {
    const next = await serviciosApi.list()
    setItems(next)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    serviciosApi
      .list()
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar los servicios'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ctx?.organizacion_id, notices])

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm())
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(item: ClubServicio) {
    if (!canManage) return
    setEditing(item)
    setForm(formFromServicio(item))
    setShowForm(true)
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!canManage) return
    const precio = Number(form.precio)
    if (!Number.isFinite(precio) || precio < 0) {
      notices.error('Indica un precio válido.')
      return
    }
    setSubmitting(true)
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      precio,
      activo: form.activo,
      icono: form.visual === 'icono' ? form.icono : '',
      image: form.visual === 'foto' ? form.image : null,
      remove_image: form.visual === 'icono' || form.removeImage,
    }
    try {
      if (editing) {
        await serviciosApi.update(editing.id, payload)
        notices.success('Servicio actualizado.')
      } else {
        await serviciosApi.create(payload)
        notices.success('Servicio creado.')
      }
      closeForm()
      await loadServices()
    } catch (err) {
      notices.error(getApiErrorMessage(err, editing ? 'No se pudo actualizar el servicio' : 'No se pudo crear el servicio'))
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActivo(item: ClubServicio) {
    if (!canManage) return
    try {
      const next = await serviciosApi.update(item.id, { activo: !item.activo })
      setItems((current) => current.map((row) => (row.id === item.id ? next : row)))
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo actualizar el servicio'))
    }
  }

  return (
    <section className="admin-page">
      {canManage ? (
        <button
          type="button"
          className={`admin-fab${showForm ? ' is-open' : ''}`}
          aria-label={showForm ? 'Cerrar formulario' : 'Crear servicio'}
          title={showForm ? 'Cerrar formulario' : 'Crear servicio'}
          onClick={() => (showForm ? closeForm() : openCreate())}
        >
          <span aria-hidden="true">+</span>
        </button>
      ) : null}

      <CreateDrawer
        open={showForm}
        title={editing ? 'Editar servicio' : 'Crear servicio'}
        onClose={closeForm}
        footer={
          <button type="submit" form="service-form" className="app-panel__btn--primary" disabled={submitting}>
            {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar servicio'}
          </button>
        }
      >
        <form id="service-form" className="admin-form" onSubmit={onSave}>
          <div className="admin-events__view-tabs" role="tablist" aria-label="Imagen del servicio">
            <button
              type="button"
              role="tab"
              aria-selected={form.visual === 'foto'}
              className={`admin-events__view${form.visual === 'foto' ? ' is-on' : ''}`}
              onClick={() => setForm((current) => ({ ...current, visual: 'foto' }))}
            >
              Foto
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={form.visual === 'icono'}
              className={`admin-events__view${form.visual === 'icono' ? ' is-on' : ''}`}
              onClick={() => setForm((current) => ({ ...current, visual: 'icono' }))}
            >
              Ícono
            </button>
          </div>
          {form.visual === 'foto' ? (
            <ImageUpload
              label="Foto"
              hint="Cuadrado. JPG, PNG o WebP."
              variant="logo"
              file={form.image}
              previewUrl={form.removeImage ? null : resolveFileUrl(editing?.image_url)}
              emptyText="Sin imagen"
              onSelect={(next) => setForm((current) => ({ ...current, image: next, removeImage: false }))}
              onClear={() => setForm((current) => ({ ...current, image: null, removeImage: true }))}
            />
          ) : (
            <ServiceIconPicker
              value={form.icono}
              onChange={(icono) => setForm((current) => ({ ...current, icono }))}
            />
          )}
          <label>
            Nombre
            <input
              value={form.nombre}
              required
              maxLength={255}
              onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
            />
          </label>
          <label>
            Descripción
            <textarea
              value={form.descripcion}
              rows={3}
              onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
            />
          </label>
          <label>
            Precio
            <input
              type="number"
              min="0"
              step="100"
              required
              value={form.precio}
              onChange={(event) => setForm((current) => ({ ...current, precio: event.target.value }))}
            />
          </label>
          <label className="admin-service-picks__check">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))}
            />
            <span>Activo en el catálogo</span>
          </label>
        </form>
      </CreateDrawer>

      {loading ? <p className="admin-empty">Cargando servicios…</p> : null}

      {!loading && items.length === 0 ? (
        <AppPanel className="admin-events__empty" narrow>
          <p className="app-panel__kicker">Catálogo</p>
          <h2 className="app-panel__title">No hay servicios</h2>
          <p className="app-panel__subtitle">
            {canManage
              ? 'Crea el primero para asociarlo a las actividades económicas del club.'
              : 'Cuando la directiva registre servicios aparecerán aquí.'}
          </p>
        </AppPanel>
      ) : null}

      {!loading && items.length ? (
        <AppPanel shine={false}>
          <p className="app-panel__kicker">Catálogo</p>
          <h2 className="app-panel__title">Servicios del club</h2>
          <p className="app-panel__subtitle">
            {items.length} servicio{items.length === 1 ? '' : 's'} propio
            {items.length === 1 ? '' : 's'} de esta organización.
          </p>
          <label className="admin-field">
            Buscar
            <input
              value={query}
              placeholder="Nombre o descripción"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {filtered.length ? (
            <div className="admin-club__table-wrap">
              <table className="admin-club__table">
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Descripción</th>
                    <th>Precio</th>
                    <th>Estado</th>
                    {canManage ? <th>Acciones</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="admin-service-name">
                          <ServiceThumb item={item} />
                          {item.nombre}
                        </span>
                      </td>
                      <td>{item.descripcion || '—'}</td>
                      <td>{formatPrice(item.precio)}</td>
                      <td>{item.activo ? 'Activo' : 'Inactivo'}</td>
                      {canManage ? (
                        <td>
                          <div className="admin-service-actions">
                            <button type="button" className="app-panel__btn--ghost" onClick={() => openEdit(item)}>
                              Editar
                            </button>
                            <button type="button" className="app-panel__btn--ghost" onClick={() => void toggleActivo(item)}>
                              {item.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="app-panel__muted">Ningún servicio coincide con la búsqueda.</p>
          )}
        </AppPanel>
      ) : null}
    </section>
  )
}
