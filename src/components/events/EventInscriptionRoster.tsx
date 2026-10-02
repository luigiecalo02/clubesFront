import { useEffect, useMemo, useState } from 'react'
import { AdminIcon } from '../../admin/AdminIcon'
import { resolveFileUrl } from '../../api/baseUrl'
import { getApiErrorMessage } from '../../api/client'
import { inscripcionesApi, type InscripcionIntegrante } from '../../api/inscripciones'
import type { EventSummary } from '../../api/types'
import { CreateDrawer } from '../../theme/CreateDrawer'
import { useNotice } from '../../theme/NoticeProvider'
import '../../theme/abonos.css'
import '../../theme/attendance-mark.css'
import '../../theme/attendance-rank.css'

const MOBILE_DRAWER = '(max-width: 900px)'

type RosterTab = 'inscritos' | 'pendientes'

type EventInscriptionRosterProps = {
  event: EventSummary
  canEdit: boolean
  onClose: () => void
  onChanged: (next: EventSummary) => void
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function applyRoster(
  next: { integrantes: InscripcionIntegrante[]; candidatos?: InscripcionIntegrante[] },
): { members: InscripcionIntegrante[]; candidates: InscripcionIntegrante[] } {
  return {
    members: next.integrantes,
    candidates: next.candidatos ?? [],
  }
}

export function EventInscriptionRoster({ event, canEdit, onClose, onChanged }: EventInscriptionRosterProps) {
  const notices = useNotice()
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_DRAWER).matches : false,
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<RosterTab>('inscritos')
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<InscripcionIntegrante[]>([])
  const [candidates, setCandidates] = useState<InscripcionIntegrante[]>([])

  useEffect(() => {
    const media = window.matchMedia(MOBILE_DRAWER)
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    inscripcionesApi
      .show(event.id)
      .then((next) => {
        if (cancelled) return
        const roster = applyRoster(next)
        setMembers(roster.members)
        setCandidates(roster.candidates)
        onChanged({ ...event, ...next.evento })
      })
      .catch((err) => {
        if (!cancelled) notices.error(getApiErrorMessage(err, 'No se pudieron cargar los inscritos'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [event.id])

  async function persist(next: InscripcionIntegrante[]) {
    if (!canEdit) return
    setSaving(true)
    try {
      const saved = await inscripcionesApi.sync(
        event.id,
        next.filter((row) => row.inscrito).map((row) => row.persona_id),
      )
      const roster = applyRoster(saved)
      setMembers(roster.members)
      setCandidates(roster.candidates)
      onChanged({ ...event, ...saved.evento })
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudieron guardar las inscripciones'))
    } finally {
      setSaving(false)
    }
  }

  function toggle(personaId: number) {
    const next = members.map((row) =>
      row.persona_id === personaId ? { ...row, inscrito: !row.inscrito } : row,
    )
    setMembers(next)
    void persist(next)
  }

  function addExternal(row: InscripcionIntegrante) {
    if (members.some((item) => item.persona_id === row.persona_id)) {
      void persist(members.map((item) => (item.persona_id === row.persona_id ? { ...item, inscrito: true } : item)))
      return
    }
    const next = [...members, { ...row, inscrito: true, origen: 'externo' as const }]
    setMembers(next)
    setCandidates((current) => current.filter((item) => item.persona_id !== row.persona_id))
    setTab('inscritos')
    void persist(next)
  }

  const inscritos = members.filter((row) => row.inscrito)
  const pendientes = members.filter((row) => !row.inscrito && row.origen !== 'externo')
  const clubInscritos = inscritos.filter((row) => row.origen !== 'externo').length
  const externosInscritos = inscritos.length - clubInscritos
  const visible = tab === 'inscritos' ? inscritos : pendientes
  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter(
      (row) =>
        row.full_name.toLowerCase().includes(q) ||
        (row.organizacion ?? '').toLowerCase().includes(q) ||
        (row.identificacion ?? '').toLowerCase().includes(q),
    )
  }, [candidates, query])

  return (
    <>
      <CreateDrawer
        open
        title={event.name}
        subtitle="Inscritos del club"
        cover={resolveFileUrl(event.banner_url)}
        placement={isMobile ? 'bottom' : 'end'}
        onClose={onClose}
      >
        {loading ? <p className="app-panel__muted">Cargando integrantes…</p> : null}
        {!loading ? (
          <>
            <div className="inscription-roster__bar">
              {canEdit ? (
                <button
                  type="button"
                  className="app-panel__btn--primary inscription-roster__add"
                  disabled={saving}
                  onClick={() => {
                    setQuery('')
                    setAdding(true)
                  }}
                >
                  Agregar acompañantes
                </button>
              ) : null}
              <div className="abonos-status-tabs" role="tablist" aria-label="Estado de inscripción">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'inscritos'}
                  className={`is-paid${tab === 'inscritos' ? ' is-on' : ''}`}
                  onClick={() => setTab('inscritos')}
                >
                  <span className="abonos-status-board__icon" aria-hidden="true">
                    <AdminIcon name="check" />
                  </span>
                  <span>
                    <strong>Inscritos ({inscritos.length})</strong>
                    <small>Ya confirmados en el evento</small>
                  </span>
                  <span className="abonos-status-board__total">
                    <strong>{inscritos.length}</strong>
                    <small>Total inscritos</small>
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'pendientes'}
                  className={tab === 'pendientes' ? 'is-on' : ''}
                  onClick={() => setTab('pendientes')}
                >
                  <span className="abonos-status-board__icon" aria-hidden="true">
                    <AdminIcon name="hourglass" />
                  </span>
                  <span>
                    <strong>Sin inscribir ({pendientes.length})</strong>
                    <small>Integrantes pendientes</small>
                  </span>
                  <span className="abonos-status-board__total">
                    <strong>{pendientes.length}</strong>
                    <small>Por inscribir</small>
                  </span>
                </button>
              </div>
            </div>
            <p className="app-panel__muted">
              {clubInscritos} de {clubInscritos + pendientes.length} integrantes
              {externosInscritos ? ` · ${externosInscritos} externos` : ''}
              {saving ? ' · Guardando…' : ''}
            </p>
            {visible.length ? (
              <div className="attendance-picks">
                {visible.map((row) => {
                  const photo = resolveFileUrl(row.foto_url)
                  return (
                    <div
                      key={row.persona_id}
                      className={`attendance-pick inscription-roster__row${row.inscrito ? ' is-on' : ''}`}
                    >
                      <span className="attendance-mark__avatar is-square" aria-hidden="true">
                        {photo ? <img src={photo} alt="" /> : initials(row.full_name)}
                      </span>
                      <span className="attendance-pick__who">
                        <strong>{row.full_name}</strong>
                        <small>
                          {row.origen === 'externo'
                            ? row.organizacion || 'Persona externa'
                            : row.inscrito
                              ? 'Inscrito'
                              : 'Sin inscribir'}
                        </small>
                      </span>
                      {canEdit ? (
                        <button
                          type="button"
                          className={row.inscrito ? 'app-panel__btn--danger' : 'app-panel__btn--primary'}
                          disabled={saving}
                          onClick={() => toggle(row.persona_id)}
                        >
                          {row.inscrito ? 'Quitar' : 'Inscribir'}
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="app-panel__muted">
                {tab === 'inscritos' ? 'Nadie está inscrito todavía.' : 'Todos los integrantes están inscritos.'}
              </p>
            )}
          </>
        ) : null}
      </CreateDrawer>

      {adding ? (
        <CreateDrawer
          open
          stacked
          title="Agregar acompañantes"
          subtitle="Iglesia padre y clubes hermanos"
          placement={isMobile ? 'bottom' : 'end'}
          onClose={() => setAdding(false)}
        >
          <label>
            Buscar
            <span className="app-panel__field">
              <input
                value={query}
                placeholder="Nombre, documento u organización"
                onChange={(event) => setQuery(event.target.value)}
              />
            </span>
          </label>
          {filteredCandidates.length ? (
            <div className="attendance-picks">
              {filteredCandidates.map((row) => {
                const photo = resolveFileUrl(row.foto_url)
                return (
                  <div key={row.persona_id} className="attendance-pick inscription-roster__row">
                    <span className="attendance-mark__avatar is-square" aria-hidden="true">
                      {photo ? <img src={photo} alt="" /> : initials(row.full_name)}
                    </span>
                    <span className="attendance-pick__who">
                      <strong>{row.full_name}</strong>
                      <small>{row.organizacion || 'Organización vinculada'}</small>
                    </span>
                    <button
                      type="button"
                      className="app-panel__btn--primary"
                      disabled={saving}
                      onClick={() => addExternal(row)}
                    >
                      Inscribir
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="app-panel__muted">
              {candidates.length
                ? 'Ninguna persona coincide con la búsqueda.'
                : 'No hay personas registradas en la iglesia padre ni en clubes hermanos.'}
            </p>
          )}
        </CreateDrawer>
      ) : null}
    </>
  )
}
