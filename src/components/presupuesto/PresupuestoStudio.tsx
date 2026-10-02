import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveFileUrl } from '../../api/baseUrl'
import type { PresupuestoBloqueKey, PresupuestoDetalle, PresupuestoEvento, PresupuestoItem } from '../../api/types'
import { AdminIcon } from '../../admin/AdminIcon'
import { AppPanel } from '../../theme/AppPanel'
import '../../theme/abonos.css'
import {
  collectItems,
  conceptIcon,
  destLabel,
  formatLongDate,
  formatMoney,
  initials,
  peopleFor,
  perPerson,
  splitByTipo,
  tipoLabel,
} from './presupuestoView'

type ConceptFilter = 'todos' | PresupuestoBloqueKey

type PresupuestoStudioProps = {
  event: PresupuestoEvento
  detail: PresupuestoDetalle
  canEdit: boolean
  saving: boolean
  nombreDraft: string
  acompanantesDraft: string
  onNombreChange: (value: string) => void
  onSaveNombre: () => void
  onSelectBudget: (id: number) => void
  onCreateBudget: () => void
  onDuplicateBudget: () => void
  onApplyActive: () => void
  onDeleteBudget: () => void
  onAddItem: () => void
  onEditItem: (item: PresupuestoItem) => void
  onRemoveItem: (item: PresupuestoItem) => void
  onAcompanantesChange: (value: string) => void
  onSaveAcompanantes: () => void
  compactHero?: boolean
}

export function PresupuestoStudio({
  event,
  detail,
  canEdit,
  saving,
  nombreDraft,
  acompanantesDraft,
  onNombreChange,
  onSaveNombre,
  onSelectBudget,
  onCreateBudget,
  onDuplicateBudget,
  onApplyActive,
  onDeleteBudget,
  onAddItem,
  onEditItem,
  onRemoveItem,
  onAcompanantesChange,
  onSaveAcompanantes,
  compactHero = false,
}: PresupuestoStudioProps) {
  const [filter, setFilter] = useState<ConceptFilter>('todos')
  const [renaming, setRenaming] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const banner = resolveFileUrl(event.banner_url ?? detail.evento.banner_url)
  const logo = resolveFileUrl(event.image_url ?? detail.evento.image_url)
  const items = useMemo(() => collectItems(detail), [detail])
  const visible = items.filter((item) => {
    if (filter === 'todos') return true
    return item.destinatario === filter || item.destinatario === 'ambos'
  })
  const miembros = detail.cantidades.miembros
  const acompanantes = detail.cantidades.acompanantes
  const totalMiembros = detail.bloques.miembros.total
  const totalAcompanantes = detail.bloques.acompanantes.total
  const totalEvento = items.reduce((sum, item) => sum + item.monto_total, 0)
  const costoIntegrante = perPerson(totalMiembros, miembros)
  const costoAcompanante = perPerson(totalAcompanantes, acompanantes)
  const splitMiembros = splitByTipo(detail.bloques.miembros.items)
  const ejemploIndividual = items.find((item) => item.tipo === 'individual')
  const ejemploGrupal = items.find((item) => item.tipo === 'grupal')
  const ejemploPersonas = miembros || acompanantes || 1
  const versions = detail.presupuestos ?? []

  useEffect(() => {
    setRenaming(false)
  }, [detail.presupuesto_id])

  useEffect(() => {
    if (renaming) nameRef.current?.focus()
  }, [renaming])

  function finishRename() {
    if (!nombreDraft.trim()) onNombreChange(detail.nombre ?? '')
    else onSaveNombre()
    setRenaming(false)
  }

  const tools = canEdit ? (
    <div className="presupuesto-hero__tools">
      <button type="button" className="app-panel__btn--ghost" disabled={saving} onClick={onCreateBudget}>
        Nuevo
      </button>
      <button
        type="button"
        className="app-panel__btn--ghost"
        disabled={saving || !detail.presupuesto_id}
        onClick={onDuplicateBudget}
      >
        Duplicar
      </button>
      {detail.presupuesto_id ? (
        <button type="button" className="app-panel__btn--danger" disabled={saving} onClick={onDeleteBudget}>
          Quitar
        </button>
      ) : null}
      {detail.presupuesto_id ? (
        <button
          type="button"
          className={detail.activo ? 'app-panel__btn--ok' : 'app-panel__btn--primary'}
          disabled={saving || Boolean(detail.activo)}
          onClick={onApplyActive}
        >
          {detail.activo ? 'Activado' : 'Activar'}
        </button>
      ) : null}
    </div>
  ) : null

  return (
    <div className="presupuesto-studio">
      {compactHero ? (
        tools
      ) : (
        <AppPanel shine={false} className="presupuesto-hero">
          <div className="presupuesto-hero__media">
            {banner ? <img src={banner} alt="" className="presupuesto-hero__cover" /> : null}
            {logo ? <img src={logo} alt="" className="presupuesto-hero__logo" /> : (
              <span className="presupuesto-hero__logo is-fallback" aria-hidden="true">
                {initials(event.name)}
              </span>
            )}
          </div>
          <div className="presupuesto-hero__body">
            <div>
              <h2 className="app-panel__title">{event.name}</h2>
              <p className="presupuesto-hero__meta">
                <span>
                  <AdminIcon name="calendar" />
                  {formatLongDate(event.starts_at)}
                </span>
                {event.lugar ? (
                  <span>
                    <AdminIcon name="map" />
                    {event.lugar}
                  </span>
                ) : null}
                <span className={`presupuesto-hero__badge${detail.presupuesto_id ? '' : ' is-off'}`}>
                  {detail.presupuesto_id ? 'Con presupuesto' : 'Sin presupuesto'}
                </span>
              </p>
            </div>
            {tools}
          </div>
        </AppPanel>
      )}

      <div className="presupuesto-versions">
        {versions.length ? (
          <div className="abonos-status-tabs" role="tablist" aria-label="Versiones del presupuesto">
            {versions.map((item) => {
              const selected = item.id === detail.presupuesto_id
              const editing = selected && renaming
              return (
                <div
                  key={item.id}
                  role="tab"
                  tabIndex={0}
                  aria-selected={selected}
                  className={`presupuesto-version-tab${item.activo ? ' is-paid' : ''}${selected ? ' is-on' : ''}`}
                  onClick={() => void onSelectBudget(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      void onSelectBudget(item.id)
                    }
                  }}
                >
                  <span className="abonos-status-board__icon" aria-hidden="true">
                    <AdminIcon name={item.activo ? 'check' : 'wallet'} />
                  </span>
                  <span>
                    <span className="presupuesto-version-tab__title">
                      {editing ? (
                        <input
                          ref={nameRef}
                          className="presupuesto-tab-name"
                          value={nombreDraft}
                          disabled={saving}
                          aria-label="Nombre del presupuesto"
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => onNombreChange(event.target.value)}
                          onBlur={finishRename}
                          onKeyDown={(event) => {
                            event.stopPropagation()
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              event.currentTarget.blur()
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault()
                              onNombreChange(detail.nombre ?? '')
                              setRenaming(false)
                            }
                          }}
                        />
                      ) : (
                        <strong>{item.nombre}</strong>
                      )}
                      {canEdit && selected && !editing ? (
                        <button
                          type="button"
                          className="presupuesto-version-tab__edit"
                          aria-label={`Editar ${item.nombre}`}
                          disabled={saving}
                          onClick={(event) => {
                            event.stopPropagation()
                            setRenaming(true)
                          }}
                        >
                          <AdminIcon name="pencil" />
                        </button>
                      ) : null}
                    </span>
                    <small>{item.activo ? 'Presupuesto activo' : 'Alternativa'}</small>
                  </span>
                  <span className="abonos-status-board__total">
                    <strong>{item.activo ? 'Activo' : selected ? 'Viendo' : 'Ver'}</strong>
                    <small>{selected ? 'Seleccionado' : 'Cambiar'}</small>
                  </span>
                </div>
              )
            })}
          </div>
        ) : null}
        {!detail.presupuesto_id ? (
          <p className="app-panel__hint">Crea un presupuesto o agrega un concepto para empezar. Solo uno puede estar activo.</p>
        ) : null}
      </div>

      <div className="presupuesto-kpis">
        <AppPanel shine={false} className="presupuesto-kpi">
          <span className="presupuesto-kpi__icon" data-tone="ok"><AdminIcon name="users" /></span>
          <small>Integrantes</small>
          <strong>{miembros}</strong>
          <Link className="app-panel__link app-panel__link--accent" to="/eventos">
            Ver participantes
          </Link>
        </AppPanel>
        <AppPanel shine={false} className="presupuesto-kpi">
          <span className="presupuesto-kpi__icon" data-tone="gold"><AdminIcon name="group" /></span>
          <small>Acompañantes</small>
          <strong>{acompanantes}</strong>
          {detail.acompanantes_inscritos === 0 && canEdit ? (
            <label className="presupuesto-kpi__field">
              Previstos
              <input
                type="number"
                min={0}
                value={acompanantesDraft}
                disabled={saving}
                onChange={(event) => onAcompanantesChange(event.target.value)}
                onBlur={onSaveAcompanantes}
              />
            </label>
          ) : (
            <Link className="app-panel__link app-panel__link--accent" to="/eventos">
              Ver acompañantes
            </Link>
          )}
        </AppPanel>
        <AppPanel shine={false} className="presupuesto-kpi">
          <span className="presupuesto-kpi__icon" data-tone="hint"><AdminIcon name="user" /></span>
          <small>Costo por integrante</small>
          <strong>{formatMoney(costoIntegrante)}</strong>
        </AppPanel>
        <AppPanel shine={false} className="presupuesto-kpi">
          <span className="presupuesto-kpi__icon" data-tone="hint"><AdminIcon name="users" /></span>
          <small>Costo por acompañante</small>
          <strong>{formatMoney(costoAcompanante)}</strong>
        </AppPanel>
        <AppPanel shine={false} className="presupuesto-kpi">
          <span className="presupuesto-kpi__icon" data-tone="alert"><AdminIcon name="wallet" /></span>
          <small>Total del evento</small>
          <strong>{formatMoney(totalEvento)}</strong>
        </AppPanel>
      </div>

      <div className="presupuesto-studio__grid">
        <AppPanel shine={false} className="presupuesto-concepts">
          <div className="presupuesto-block__head">
            <div>
              <h3>Conceptos del presupuesto</h3>
              <p className="app-panel__muted">
                Agrega los costos del evento y define si son individuales o grupales.
              </p>
            </div>
            {canEdit ? (
              <button type="button" className="app-panel__btn--primary" disabled={saving} onClick={onAddItem}>
                Agregar concepto
              </button>
            ) : null}
          </div>

          <div className="presupuesto-filters" role="tablist" aria-label="Conceptos del presupuesto">
            {(
              [
                {
                  id: 'todos' as const,
                  label: 'Todos',
                  hint: `${items.length} concepto${items.length === 1 ? '' : 's'}`,
                  total: totalEvento,
                  icon: 'tags' as const,
                },
                {
                  id: 'miembros' as const,
                  label: 'Integrantes',
                  hint: `${miembros} persona${miembros === 1 ? '' : 's'}`,
                  total: totalMiembros,
                  icon: 'users' as const,
                },
                {
                  id: 'acompanantes' as const,
                  label: 'Acompañantes',
                  hint: `${acompanantes} persona${acompanantes === 1 ? '' : 's'}`,
                  total: totalAcompanantes,
                  icon: 'group' as const,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                className={`presupuesto-version-tab${filter === tab.id ? ' is-on' : ''}`}
                onClick={() => setFilter(tab.id)}
              >
                <span className="abonos-status-board__icon" aria-hidden="true">
                  <AdminIcon name={tab.icon} />
                </span>
                <span>
                  <strong>{tab.label}</strong>
                  <small>{tab.hint}</small>
                </span>
                <span className="abonos-status-board__total">
                  <strong>{formatMoney(tab.total)}</strong>
                  <small>Total</small>
                </span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="app-panel__hint">Todavía no hay conceptos en este presupuesto.</p>
          ) : (
            <div className="presupuesto-table-wrap">
              <table className="presupuesto-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Concepto</th>
                    <th>Tipo</th>
                    <th>Aplica a</th>
                    <th>Valor</th>
                    <th>Partícipes</th>
                    <th>Total</th>
                    <th>Por persona</th>
                    {canEdit ? <th>Acciones</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item, index) => {
                    const people = peopleFor(item, detail)
                    return (
                      <tr
                        key={item.id ?? `${item.concepto}-${index}`}
                        className="presupuesto-table__row"
                        tabIndex={0}
                        onClick={() => onEditItem(item)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onEditItem(item)
                          }
                        }}
                      >
                        <td data-label="#">{index + 1}</td>
                        <td data-label="Concepto">
                          <span className="presupuesto-concept">
                            <AdminIcon name={conceptIcon(item.concepto)} />
                            {item.concepto}
                          </span>
                        </td>
                        <td data-label="Tipo">{tipoLabel(item.tipo)}</td>
                        <td data-label="Aplica a">{destLabel(item.destinatario)}</td>
                        <td data-label="Valor">{formatMoney(item.monto)}</td>
                        <td data-label="Partícipes">{people}</td>
                        <td data-label="Total">{formatMoney(item.monto_total)}</td>
                        <td data-label="Por persona">{formatMoney(item.por_persona ?? perPerson(item.monto_total, people))}</td>
                        {canEdit ? (
                          <td>
                            <div className="presupuesto-row-actions">
                              <button
                                type="button"
                                className="app-panel__btn--ghost"
                                disabled={saving}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onEditItem(item)
                                }}
                              >
                                Editar
                              </button>
                              {item.id ? (
                                <button
                                  type="button"
                                  className="app-panel__btn--danger"
                                  disabled={saving}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    onRemoveItem(item)
                                  }}
                                >
                                  Quitar
                                </button>
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AppPanel>

        <AppPanel shine={false} className="presupuesto-summary">
          <h3>Resumen del cálculo</h3>
          <div className="presupuesto-summary__group">
            <p>
              <AdminIcon name="users" />
              Integrantes <strong>{miembros} personas</strong>
            </p>
            <p>
              <AdminIcon name="group" />
              Acompañantes <strong>{acompanantes} personas</strong>
            </p>
          </div>
          <dl className="presupuesto-summary__list">
            <div>
              <dt>Costos individuales (integrantes)</dt>
              <dd>{formatMoney(splitMiembros.individual)}</dd>
            </div>
            <div>
              <dt>Costos grupales (integrantes)</dt>
              <dd>{formatMoney(splitMiembros.grupal)}</dd>
            </div>
            <div className="is-strong">
              <dt>Total integrantes</dt>
              <dd>{formatMoney(totalMiembros)}</dd>
            </div>
          </dl>
          <p className="presupuesto-summary__kicker">
            <AdminIcon name="group" />
            Costos acompañantes
          </p>
          <dl className="presupuesto-summary__list">
            {detail.bloques.acompanantes.items.map((item, index) => (
              <div key={item.id ?? `${item.concepto}-${index}`}>
                <dt>
                  {item.concepto} ({tipoLabel(item.tipo)})
                </dt>
                <dd>{formatMoney(item.monto_total)}</dd>
              </div>
            ))}
            <div className="is-strong">
              <dt>Total acompañantes</dt>
              <dd>{formatMoney(totalAcompanantes)}</dd>
            </div>
            <div className="is-total">
              <dt>Total del evento</dt>
              <dd>{formatMoney(totalEvento)}</dd>
            </div>
          </dl>
        </AppPanel>
      </div>

      <div className="presupuesto-help">
        <AppPanel shine={false} className="presupuesto-help__card">
          <p className="app-panel__kicker">Cómo funciona el cálculo</p>
          <h3>
            <AdminIcon name="user" />
            Costo individual
          </h3>
          <ul>
            <li>El valor se asigna a cada participante.</li>
            <li>Se multiplica por el número de personas que aplican.</li>
          </ul>
          <p className="app-panel__muted">
            Ejemplo:{' '}
            {ejemploIndividual
              ? `${formatMoney(ejemploIndividual.monto)} × ${peopleFor(ejemploIndividual, detail) || ejemploPersonas} = ${formatMoney(ejemploIndividual.monto_total)}`
              : `${formatMoney(20000)} × ${ejemploPersonas} integrantes`}
          </p>
        </AppPanel>
        <AppPanel shine={false} className="presupuesto-help__card">
          <h3>
            <AdminIcon name="users" />
            Costo grupal
          </h3>
          <ul>
            <li>Se ingresa el valor total del concepto.</li>
            <li>Se divide automáticamente entre el número de participantes que aplican.</li>
          </ul>
          <p className="app-panel__muted">
            Ejemplo:{' '}
            {ejemploGrupal
              ? `${formatMoney(ejemploGrupal.monto)} ÷ ${peopleFor(ejemploGrupal, detail) || ejemploPersonas} = ${formatMoney(ejemploGrupal.por_persona ?? perPerson(ejemploGrupal.monto, peopleFor(ejemploGrupal, detail) || ejemploPersonas))} por persona`
              : `${formatMoney(650000)} ÷ ${ejemploPersonas} integrantes`}
          </p>
        </AppPanel>
        <AppPanel shine={false} className="presupuesto-help__card">
          <h3>
            <AdminIcon name="wallet" />
            Costo por persona
          </h3>
          <dl className="presupuesto-summary__list">
            <div>
              <dt>Por integrante</dt>
              <dd>{formatMoney(costoIntegrante)}</dd>
            </div>
            <div>
              <dt>Por acompañante</dt>
              <dd>{formatMoney(costoAcompanante)}</dd>
            </div>
          </dl>
          <p className="app-panel__muted">
            El costo por persona es el valor total de su grupo dividido entre el número de participantes.
          </p>
        </AppPanel>
      </div>
    </div>
  )
}
