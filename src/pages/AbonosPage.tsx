import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { abonosApi } from '../api/abonos'
import { resolveFileUrl } from '../api/baseUrl'
import { getApiErrorMessage } from '../api/client'
import type { AbonoFila, AbonosBoard, AbonosModo } from '../api/types'
import { AdminIcon } from '../admin/AdminIcon'
import { canAccessClubAbonos } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import { AbonoPayForm, emptyAbonoPayDraft, composeAbonoNota, parseAbonoNota, type AbonoPayDraft } from '../components/abonos/AbonoPayForm'
import { memberInitials } from '../components/attendance/AttendanceMarkList'
import { ServiceThumb } from '../components/services/ServiceVisual'
import { AppPanel } from '../theme/AppPanel'
import { CreateDrawer } from '../theme/CreateDrawer'
import { formatDate } from '../theme/dates'
import { useNotice } from '../theme/NoticeProvider'
import '../theme/abonos.css'

const MOBILE_ABONOS = '(max-width: 900px)'

type PayFilter = 'pendientes' | 'todos'
type DealTab = 'abonar' | 'pagados'

function formatPrice(value: number | string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function emptyBoard(): AbonosBoard {
  return {
    modo: 'integrante',
    resumen: { comprometido: 0, abonado: 0, pendiente: 0 },
    opciones_integrantes: [],
    opciones_actividades: [],
    filas: [],
  }
}

function emptyDraft() {
  return emptyAbonoPayDraft()
}

function rowKey(row: AbonoFila, index: number): string {
  return `${row.persona_id ?? 'p'}-${row.evento_id ?? 'e'}-${index}`
}

function pickKey(row: AbonoFila): string {
  return `${row.persona_id ?? 'p'}-${row.evento_id ?? 'e'}`
}

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}


function DealStatusRow({
  row,
  title,
  photo,
  square = false,
  paid,
  canPay = false,
  onPay,
  onDetails,
}: {
  row: AbonoFila
  title: string
  photo?: string | null
  square?: boolean
  paid: boolean
  canPay?: boolean
  onPay?: () => void
  onDetails: () => void
}) {
  return (
    <article className={`abonos-status-row${paid ? ' is-ok' : ''}`}>
      <AbonosAvatar name={title || '?'} photo={photo} square={square} />
      <span className="abonos-deal__who">
        <strong>{title || 'Sin nombre'}</strong>
        <small>{row.starts_at ? formatDate(row.starts_at) : '—'}</small>
      </span>
      <span className="abonos-status-row__money">
        <strong>{formatPrice(paid ? row.abonado : row.pendiente)}</strong>
        <small>{paid ? 'Pagado' : 'Pendiente'}</small>
      </span>
      <div className="abonos-deal__actions">
        {canPay ? (
          <button type="button" className="app-panel__btn--primary" onClick={onPay}>
            Abonar
          </button>
        ) : null}
        <button type="button" className="app-panel__btn--ghost" onClick={onDetails}>
          Ver detalles
        </button>
      </div>
    </article>
  )
}

function AbonosAvatar({
  name,
  photo,
  square = false,
}: {
  name: string
  photo?: string | null
  square?: boolean
}) {
  const src = resolveFileUrl(photo)
  return (
    <span className={`abonos-avatar${square ? ' is-square' : ''}`} aria-hidden="true">
      {src ? <img src={src} alt="" /> : memberInitials(name || '?')}
    </span>
  )
}

export function AbonosPage() {
  const auth = useAuth()
  const ctx = auth.user?.contexto
  const canEdit =
    canAccessClubAbonos({
      rolName: ctx?.rol_name,
      organizacionId: ctx?.organizacion_id,
    }) || auth.can('abonos.update')
  const notices = useNotice()
  const [modo, setModo] = useState<AbonosModo>('integrante')
  const [personaId, setPersonaId] = useState<number | null>(null)
  const [eventoId, setEventoId] = useState<number | null>(null)
  const [list, setList] = useState<AbonosBoard>(emptyBoard)
  const [detail, setDetail] = useState<AbonosBoard>(emptyBoard)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PayFilter>('pendientes')
  const [detailsKey, setDetailsKey] = useState<string | null>(null)
  const [detailsTab, setDetailsTab] = useState<'servicios' | 'abonos'>('servicios')
  const [dealTab, setDealTab] = useState<DealTab>('abonar')
  const [payKey, setPayKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<AbonoPayDraft>(emptyDraft)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_ABONOS).matches : false,
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  const selected = modo === 'integrante' ? personaId : eventoId
  const selectedRow = list.filas.find((row) =>
    modo === 'integrante' ? row.persona_id === personaId : row.evento_id === eventoId,
  )
  const selectedName =
    modo === 'integrante' ? selectedRow?.full_name : selectedRow?.evento_name
  const pendingDeals = detail.filas.filter((row) => row.pendiente > 0)
  const paidDeals = detail.filas.filter((row) => row.pendiente <= 0)
  const pendingTotal = pendingDeals.reduce((sum, row) => sum + Number(row.pendiente || 0), 0)
  const paidTotal = paidDeals.reduce((sum, row) => sum + Number(row.abonado || 0), 0)
  const pendingHint =
    modo === 'integrante' ? 'Actividades con saldo pendiente' : 'Integrantes con saldo pendiente'
  const paidHint = modo === 'integrante' ? 'Actividades ya pagadas' : 'Integrantes que ya pagaron'

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return list.filas.filter((row) => {
      if (filter === 'pendientes' && row.pendiente <= 0) return false
      if (!needle) return true
      const haystack = `${row.full_name ?? ''} ${row.evento_name ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [filter, list.filas, query])

  const payRow = detail.filas.find((row) => pickKey(row) === payKey) ?? null
  const payTitle = modo === 'integrante' ? payRow?.evento_name : payRow?.full_name
  const payPersonName = payRow?.full_name || selectedRow?.full_name
  const payPhoto = payRow?.foto_url || selectedRow?.foto_url
  const detailsRow = detail.filas.find((row) => pickKey(row) === detailsKey) ?? null
  const detailsTitle = modo === 'integrante' ? detailsRow?.evento_name : detailsRow?.full_name
  const detailsPhoto = detailsRow?.foto_url || selectedRow?.foto_url
  const drawerPlacement = isMobile ? 'bottom' : 'end'

  useEffect(() => {
    let cancelled = false
    setLoadingList(true)
    abonosApi
      .board({ modo })
      .then((next) => {
        if (cancelled) return
        setList(next)
        setPersonaId(null)
        setEventoId(null)
        setDrawerOpen(false)
        setDetailsKey(null)
        setPayKey(null)
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar los abonos'))
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [modo, notices])

  useEffect(() => {
    const media = window.matchMedia(MOBILE_ABONOS)
    const sync = () => {
      setIsMobile(media.matches)
      if (!media.matches) setDrawerOpen(false)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!selected) {
      setDetail(emptyBoard())
      setDetailsKey(null)
      setPayKey(null)
      return undefined
    }
    let cancelled = false
    setLoadingDetail(true)
    abonosApi
      .board({
        modo,
        personaId: modo === 'integrante' ? personaId : null,
        eventoId: modo === 'actividad' ? eventoId : null,
      })
      .then((next) => {
        if (cancelled) return
        setDetail(next)
        setDetailsKey(null)
        setPayKey(null)
        setDraft(emptyDraft())
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudo cargar el detalle'))
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventoId, modo, notices, personaId, selected])

  useEffect(() => {
    setDealTab('abonar')
  }, [modo, selected])

  function changeModo(next: AbonosModo) {
    if (next === modo) return
    setModo(next)
    setPersonaId(null)
    setEventoId(null)
    setQuery('')
    setDetailsKey(null)
    setPayKey(null)
    setDraft(emptyDraft())
  }

  function pickRow(row: AbonoFila) {
    if (modo === 'integrante' && row.persona_id) setPersonaId(row.persona_id)
    if (modo === 'actividad' && row.evento_id) setEventoId(row.evento_id)
    if (isMobile) setDrawerOpen(true)
  }

  function closeDetail() {
    setDrawerOpen(false)
    closePay()
    closeDetails()
    if (isMobile) {
      setPersonaId(null)
      setEventoId(null)
    }
  }

  function openDetails(row: AbonoFila) {
    setDetailsKey(pickKey(row))
    setDetailsTab('servicios')
  }

  function closeDetails() {
    setDetailsKey(null)
    setDetailsTab('servicios')
  }

  function startPay(row: AbonoFila) {
    if (!canEdit || row.pendiente <= 0) return
    setPayKey(pickKey(row))
    setDraft({
      ...emptyDraft(),
      monto: String(Math.round(row.pendiente)),
    })
  }

  function closePay() {
    setPayKey(null)
    setDraft(emptyDraft())
  }

  async function submitAbono(event?: FormEvent) {
    event?.preventDefault()
    if (!canEdit) {
      notices.error('No puedes registrar abonos.')
      return
    }
    if (!payRow?.persona_id || !payRow.evento_id) {
      notices.error('No se encontró el compromiso para abonar.')
      return
    }
    const monto = Number(draft.monto)
    if (!draft.metodo) {
      notices.warning('Elige un método de pago.')
      return
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      notices.warning('Escribe un monto mayor a cero.')
      return
    }
    setSaving(true)
    try {
      const next = await abonosApi.store({
        evento_id: payRow.evento_id,
        persona_id: payRow.persona_id,
        monto,
        nota: composeAbonoNota(draft),
        modo,
      })
      setDetail(next)
      const listed = await abonosApi.board({ modo })
      setList(listed)
      closePay()
      setDraft(emptyDraft())
      notices.success('Abono registrado.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo registrar el abono'))
    } finally {
      setSaving(false)
    }
  }

  const listNoun = modo === 'integrante' ? 'integrantes' : 'actividades'
  const pendingNoun = modo === 'integrante' ? ['actividad pendiente', 'actividades pendientes'] : ['integrante pendiente', 'integrantes pendientes']
  const detailContent = (
    <>
      {!selected ? (
        <p className="app-panel__hint">Elige un integrante o una actividad para registrar el recaudo.</p>
      ) : null}

      {selected && selectedRow ? (
        <header className="abonos-detail__head">
          <AbonosAvatar
            name={selectedName || '?'}
            photo={modo === 'integrante' ? selectedRow.foto_url : selectedRow.image_url}
            square={modo === 'actividad'}
          />
          <div>
            <h3>{selectedName || 'Sin nombre'}</h3>
            <p>
              {ctx?.organizacion_nombre ? `${ctx.organizacion_nombre} · ` : ''}
              {countLabel(selectedRow.pendientes ?? 0, pendingNoun[0], pendingNoun[1])}
            </p>
          </div>
          <p className="abonos-detail__total">
            <strong>{formatPrice(selectedRow.pendiente)}</strong>
            <span>Total pendiente</span>
          </p>
        </header>
      ) : null}

      {loadingDetail ? <p className="app-panel__muted">Cargando compromisos…</p> : null}

      {selected && !loadingDetail && detail.filas.length ? (
        <>
          <section className="abonos-deals">
            <div className="abonos-status-tabs" role="tablist" aria-label="Estado de los compromisos">
              <button
                type="button"
                role="tab"
                aria-selected={dealTab === 'abonar'}
                className={dealTab === 'abonar' ? 'is-on' : ''}
                onClick={() => setDealTab('abonar')}
              >
                <span className="abonos-status-board__icon" aria-hidden="true">
                  <AdminIcon name="hourglass" />
                </span>
                <span>
                  <strong>Por abonar ({pendingDeals.length})</strong>
                  <small>{pendingHint}</small>
                </span>
                <span className="abonos-status-board__total">
                  <strong>{formatPrice(pendingTotal)}</strong>
                  <small>Total pendiente</small>
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={dealTab === 'pagados'}
                className={`is-paid${dealTab === 'pagados' ? ' is-on' : ''}`}
                onClick={() => setDealTab('pagados')}
              >
                <span className="abonos-status-board__icon" aria-hidden="true">
                  <AdminIcon name="check" />
                </span>
                <span>
                  <strong>Pagados ({paidDeals.length})</strong>
                  <small>{paidHint}</small>
                </span>
                <span className="abonos-status-board__total">
                  <strong>{formatPrice(paidTotal)}</strong>
                  <small>Total pagado</small>
                </span>
              </button>
            </div>
            <div className="abonos-status-board is-on">
              {dealTab === 'abonar' ? (
                pendingDeals.length ? (
                  pendingDeals.map((row, index) => (
                    <DealStatusRow
                      key={rowKey(row, index)}
                      row={row}
                      title={(modo === 'integrante' ? row.evento_name : row.full_name) || 'Sin nombre'}
                      photo={modo === 'integrante' ? row.image_url : row.foto_url}
                      square={modo === 'integrante'}
                      paid={false}
                      canPay={canEdit}
                      onPay={() => startPay(row)}
                      onDetails={() => openDetails(row)}
                    />
                  ))
                ) : (
                  <p className="app-panel__muted">No hay compromisos por abonar.</p>
                )
              ) : paidDeals.length ? (
                paidDeals.map((row, index) => (
                  <DealStatusRow
                    key={rowKey(row, index)}
                    row={row}
                    title={(modo === 'integrante' ? row.evento_name : row.full_name) || 'Sin nombre'}
                    photo={modo === 'integrante' ? row.image_url : row.foto_url}
                    square={modo === 'integrante'}
                    paid
                    onDetails={() => openDetails(row)}
                  />
                ))
              ) : (
                <p className="app-panel__muted">Todavía no hay compromisos pagados.</p>
              )}
            </div>
          </section>

        </>
      ) : null}
    </>
  )

  return (
    <section className="admin-page admin-page--abonos">
      <AppPanel shine={false} className="abonos-workspace">
        <p className="app-panel__kicker">Recaudo</p>
        <h2 className="app-panel__title">Registrar abono</h2>
        <p className="app-panel__subtitle">
          Busca primero a la persona o la actividad. Luego registra exactamente lo que recibió.
        </p>
      </AppPanel>

      <div className="abonos-workspace__grid">
        <AppPanel shine={false} className="abonos-board">
            <div className="admin-event-tabs" role="tablist" aria-label="Vista de abonos">
              <button
                type="button"
                role="tab"
                aria-selected={modo === 'integrante'}
                className={`admin-events__view${modo === 'integrante' ? ' is-on' : ''}`}
                onClick={() => changeModo('integrante')}
              >
                <AdminIcon name="user" />
                Por integrante
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={modo === 'actividad'}
                className={`admin-events__view${modo === 'actividad' ? ' is-on' : ''}`}
                onClick={() => changeModo('actividad')}
              >
                <AdminIcon name="calendar" />
                Por actividad
              </button>
            </div>

            <label className="abonos-search">
              Buscar
              <span className="app-panel__field">
                <AdminIcon name="users" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={modo === 'integrante' ? 'Buscar integrante por nombre…' : 'Buscar actividad por nombre…'}
                />
                {query ? (
                  <button type="button" className="abonos-search__clear" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
                    ×
                  </button>
                ) : null}
              </span>
            </label>

            <div className="abonos-board__meta">
              <p>
                Se encontraron {filtered.length} {listNoun}
              </p>
              <label>
                <span className="sr-only">Filtro</span>
                <select value={filter} onChange={(event) => setFilter(event.target.value as PayFilter)}>
                  <option value="pendientes">Pendientes</option>
                  <option value="todos">Todos</option>
                </select>
              </label>
            </div>

            {loadingList ? <p className="app-panel__muted">Cargando abonos…</p> : null}
            {!loadingList && filtered.length === 0 ? (
              <p className="app-panel__hint">
                {list.filas.length === 0
                  ? 'Todavía no hay participantes con cantidades en actividades económicas.'
                  : 'Nadie coincide con esa búsqueda o filtro.'}
              </p>
            ) : null}

            <div className="abonos-picks">
              {filtered.map((row, index) => {
                const title = modo === 'integrante' ? row.full_name : row.evento_name
                const pending = row.pendientes ?? (row.pendiente > 0 ? 1 : 0)
                const on = modo === 'integrante' ? row.persona_id === personaId : row.evento_id === eventoId
                return (
                  <button
                    key={rowKey(row, index)}
                    type="button"
                    className={`abonos-pick${on ? ' is-on' : ''}`}
                    onClick={() => pickRow(row)}
                  >
                    <AbonosAvatar
                      name={title || '?'}
                      photo={modo === 'integrante' ? row.foto_url : row.image_url}
                      square={modo === 'actividad'}
                    />
                    <span className="abonos-pick__who">
                      <strong>{title || 'Sin nombre'}</strong>
                      <small>{countLabel(pending, pendingNoun[0], pendingNoun[1])}</small>
                    </span>
                    <span className="abonos-pick__money">
                      <strong>{formatPrice(row.pendiente)}</strong>
                      <small>Total pendiente</small>
                    </span>
                    <AdminIcon name="chevronRight" />
                  </button>
                )
              })}
            </div>
        </AppPanel>

        {!isMobile ? (
          <AppPanel shine={false} className="abonos-detail">
            {detailContent}
          </AppPanel>
        ) : null}
      </div>

      {isMobile ? (
        <CreateDrawer
          open={drawerOpen && Boolean(selected)}
          title={selectedName || 'Registrar abono'}
          subtitle="Recaudo"
          placement="bottom"
          onClose={closeDetail}
        >
          <div className="abonos-detail">{detailContent}</div>
        </CreateDrawer>
      ) : null}

      <CreateDrawer
        open={Boolean(detailsRow)}
        stacked
        size="half"
        placement={drawerPlacement}
        title={detailsTitle || 'Detalle'}
        subtitle="Pedidos y abonos"
        cover={resolveFileUrl(detailsRow?.banner_url)}
        avatar={resolveFileUrl(detailsPhoto)}
        avatarFallback={memberInitials(detailsRow?.full_name || selectedRow?.full_name || detailsTitle || 'AB')}
        onClose={closeDetails}
      >
        {detailsRow ? (
          <div className="abonos-detail">
            <div className="abonos-deal__money">
              <p className="event-countdown__cell">
                <strong>{formatPrice(detailsRow.comprometido)}</strong>
                <span>Comprometido</span>
              </p>
              <p className="event-countdown__cell">
                <strong>{formatPrice(detailsRow.abonado)}</strong>
                <span>Abonado</span>
              </p>
              <p className="event-countdown__cell">
                <strong>{formatPrice(detailsRow.pendiente)}</strong>
                <span>Pendiente</span>
              </p>
            </div>
            <div className="admin-event-tabs" role="tablist" aria-label="Detalle del compromiso">
              <button
                type="button"
                role="tab"
                aria-selected={detailsTab === 'servicios'}
                className={`admin-events__view${detailsTab === 'servicios' ? ' is-on' : ''}`}
                onClick={() => setDetailsTab('servicios')}
              >
                <AdminIcon name="box" />
                Servicios
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={detailsTab === 'abonos'}
                className={`admin-events__view${detailsTab === 'abonos' ? ' is-on' : ''}`}
                onClick={() => setDetailsTab('abonos')}
              >
                <AdminIcon name="wallet" />
                Abonos
              </button>
            </div>
            {detailsTab === 'servicios' && detailsRow.pedidos?.length ? (
              <ul className="abonos-pedidos">
                {detailsRow.pedidos.map((pedido) => (
                  <li key={pedido.id}>
                    <span className="abonos-pedidos__name">
                      <ServiceThumb item={pedido} />
                      {pedido.nombre}
                    </span>
                    <span className="abonos-pedidos__qty">{pedido.cantidad} uds</span>
                    <strong>{formatPrice(pedido.total)}</strong>
                  </li>
                ))}
              </ul>
            ) : null}
            {detailsTab === 'servicios' && !detailsRow.pedidos?.length ? (
              <p className="app-panel__muted">No hay pedidos registrados en este compromiso.</p>
            ) : null}
            {detailsTab === 'abonos' && detailsRow.abonos?.length ? (
              <ul className="abonos-history">
                {detailsRow.abonos.map((abono) => {
                  const nota = parseAbonoNota(abono.nota)
                  return (
                    <li key={abono.id}>
                      <span className="abonos-history__who">
                        <AdminIcon name="wallet" />
                        <span>
                          <strong>{abono.created_at ? formatDate(abono.created_at) : nota.fecha || 'Abono'}</strong>
                          {nota.metodo ? <small>{nota.metodo}</small> : null}
                          {nota.texto ? <small>{nota.texto}</small> : null}
                        </span>
                      </span>
                      <strong>{formatPrice(abono.monto)}</strong>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {detailsTab === 'abonos' && !detailsRow.abonos?.length ? (
              <p className="app-panel__muted">Todavía no hay abonos en este compromiso.</p>
            ) : null}
          </div>
        ) : null}
      </CreateDrawer>

      <CreateDrawer
        open={Boolean(payRow)}
        stacked
        size="half"
        placement={drawerPlacement}
        title={payTitle || 'Registrar abono'}
        subtitle="Recaudo"
        cover={resolveFileUrl(payRow?.banner_url)}
        avatar={resolveFileUrl(payPhoto)}
        avatarFallback={memberInitials(payPersonName || payTitle || 'AB')}
        onClose={closePay}
        footer={
          <>
            <button type="button" className="app-panel__btn--ghost" onClick={closePay}>
              Cancelar
            </button>
            <button
              type="button"
              className="app-panel__btn--primary"
              disabled={saving || !payRow || payRow.pendiente <= 0}
              onClick={() => void submitAbono()}
            >
              <AdminIcon name="wallet" />
              Registrar abono
            </button>
          </>
        }
      >
        {payRow ? (
          <div className="abonos-detail">
            <div className="abonos-deal__money">
              <p className="event-countdown__cell">
                <strong>{formatPrice(payRow.comprometido)}</strong>
                <span>Comprometido</span>
              </p>
              <p className="event-countdown__cell">
                <strong>{formatPrice(payRow.abonado)}</strong>
                <span>Abonado</span>
              </p>
              <p className="event-countdown__cell">
                <strong>{formatPrice(payRow.pendiente)}</strong>
                <span>Pendiente</span>
              </p>
            </div>
            <AbonoPayForm
              draft={draft}
              pendiente={payRow.pendiente}
              saving={saving}
              showSubmit={false}
              onChange={setDraft}
              onSubmit={(event) => void submitAbono(event)}
            />
          </div>
        ) : null}
      </CreateDrawer>
    </section>
  )
}
