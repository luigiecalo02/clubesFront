import { useEffect, useState } from 'react'
import { resolveFileUrl } from '../api/baseUrl'
import { clubsApi } from '../api/clubs'
import { getApiErrorMessage } from '../api/client'
import { settingsApi } from '../api/settings'
import type {
  ClubBoardPosition,
  ClubDetail,
  ClubDirector,
  ClubDirectorAssignment,
  ClubPerson,
  ClubesInviteLink,
} from '../api/types'
import {
  canCreateClubMember,
  canImpersonateClubMember,
  canManageClubDirectors,
  canUpdateClubMember,
  isClubDirectorRole,
} from '../admin/menu'
import { MemberRow } from '../components/members/MemberActions'
import { MemberDrawer, type MemberDrawerMode } from '../components/members/MemberDrawer'
import { PersonSearchSelect } from '../components/members/PersonSearchSelect'
import { useAuth } from '../auth/AuthProvider'
import { AppPanel } from '../theme/AppPanel'
import { useNotice } from '../theme/NoticeProvider'

const MINISTRY_LABELS: Record<string, string> = {
  conquistadores: 'Conquistadores',
  aventureros: 'Aventureros',
  guias_mayores: 'Guías Mayores',
}

const BOARD_POSITIONS: ClubBoardPosition[] = ['director', 'subdirector', 'secretaria', 'tesorero']

const BOARD_LABELS: Record<ClubBoardPosition, string> = {
  director: 'Director',
  subdirector: 'Subdirector',
  secretaria: 'Secretari@',
  tesorero: 'Tesorer@',
}

function ministryLabel(tipo: string): string {
  return MINISTRY_LABELS[tipo] ?? tipo.replaceAll('_', ' ')
}

function holderFor(directors: ClubDirector[], position: ClubBoardPosition): ClubDirector | undefined {
  return directors.find((row) => row.ministry === position)
}

function boardOptionLabel(persona: ClubPerson): string {
  return persona.correo ? `${persona.full_name} · ${persona.correo}` : `${persona.full_name} · sin correo`
}

function directorName(row: ClubDirector): string {
  return row.persona?.full_name || row.user?.name || 'Sin asignar'
}

export function MyClubPage() {
  const auth = useAuth()
  const ctx = auth.user?.contexto
  const [club, setClub] = useState<ClubDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<ClubesInviteLink | null>(null)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [savingBoard, setSavingBoard] = useState<ClubBoardPosition | null>(null)
  const access = {
    can: auth.can,
    rolName: ctx?.rol_name,
    organizacionId: ctx?.organizacion_id,
  }
  const canInvite = isClubDirectorRole(ctx?.rol_name)
  const canAssignBoard = canManageClubDirectors(access)
  const canCreateMembers = canCreateClubMember(access)
  const canUpdateMembers = canUpdateClubMember(access)
  const canImpersonateMembers = canImpersonateClubMember(access)
  const [clubTab, setClubTab] = useState<'directiva' | 'integrantes'>('directiva')
  const [memberMode, setMemberMode] = useState<MemberDrawerMode | null>(null)
  const [memberSelected, setMemberSelected] = useState<ClubPerson | null>(null)
  const notices = useNotice()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    clubsApi
      .current()
      .then((next) => {
        if (!cancelled) setClub(next)
      })
      .catch((err) => {
        if (!cancelled) {
          setClub(null)
          notices.error(getApiErrorMessage(err, 'No se pudo cargar la ficha del club'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ctx?.organizacion_id, ctx?.rol_id, notices])

  async function onCreateInvite() {
    setCreatingInvite(true)
    try {
      const next = await settingsApi.createInviteLink()
      setInvite(next)
      notices.success('Comparte este enlace. Quien lo abra solo escribe su identificación.')
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo generar el enlace'))
    } finally {
      setCreatingInvite(false)
    }
  }

  async function onAssignBoard(position: ClubBoardPosition, rawId: string) {
    if (!club || !canAssignBoard) return
    const personaId = Number(rawId)
    const assignment: ClubDirectorAssignment = personaId
      ? { mode: 'select', persona_id: personaId }
      : { clear: true }
    setSavingBoard(position)
    try {
      const next = await clubsApi.updateDirectors(club.id, { [position]: assignment })
      setClub(next)
      notices.success(
        personaId
          ? `${BOARD_LABELS[position]} asignado.`
          : `${BOARD_LABELS[position]} quedó sin asignar.`,
      )
    } catch (err) {
      notices.error(getApiErrorMessage(err, 'No se pudo actualizar la directiva'))
    } finally {
      setSavingBoard(null)
    }
  }

  function closeMemberDrawer() {
    setMemberMode(null)
    setMemberSelected(null)
  }

  function openCreateMember() {
    setMemberSelected(null)
    setClubTab('integrantes')
    setMemberMode('create')
  }

  function openMember(mode: MemberDrawerMode, persona: ClubPerson) {
    setMemberSelected(persona)
    setMemberMode(mode)
  }

  function applyMember(next: ClubPerson) {
    setClub((current) => {
      if (!current) return current
      const personas = current.personas ?? []
      const exists = personas.some((row) => row.id === next.id)
      const nextPersonas = exists
        ? personas.map((row) => (row.id === next.id ? { ...row, ...next } : row))
        : [...personas, next]
      return {
        ...current,
        personas: nextPersonas,
        personas_count: nextPersonas.length,
      }
    })
  }

  async function onCopyInvite() {
    if (!invite?.url) return
    try {
      await navigator.clipboard.writeText(invite.url)
      notices.success('Enlace copiado. Envíalo a los integrantes sin cuenta.')
    } catch {
      notices.warning(invite.url)
    }
  }

  const logo = resolveFileUrl(club?.logo_url || club?.logo)
  const tipos = (club?.tipos ?? ctx?.club_tipos ?? []).map(ministryLabel)
  const iglesia = club?.organizacion?.padre?.nombre
  const members = club?.personas ?? []
  const directors = club?.directors ?? []

  return (
    <section className="admin-page">
      {loading ? (
        <AppPanel>
          <p className="app-panel__kicker">Mi Club</p>
          <h2 className="app-panel__title">Cargando ficha</h2>
          <p className="app-panel__subtitle">Un momento, estamos trayendo los datos del club.</p>
        </AppPanel>
      ) : null}

      {canCreateMembers ? (
        <button
          type="button"
          className={`admin-fab${memberMode === 'create' ? ' is-open' : ''}`}
          aria-label={memberMode === 'create' ? 'Cerrar formulario' : 'Agregar integrante'}
          title={memberMode === 'create' ? 'Cerrar formulario' : 'Agregar integrante'}
          onClick={() => (memberMode === 'create' ? closeMemberDrawer() : openCreateMember())}
        >
          <span aria-hidden="true">+</span>
        </button>
      ) : null}

      <MemberDrawer
        mode={memberMode}
        persona={memberSelected}
        organizacionId={ctx?.organizacion_id}
        onClose={closeMemberDrawer}
        onCreated={applyMember}
        onUpdated={applyMember}
      />

      {!loading && !club ? (
        <AppPanel>
          <p className="app-panel__kicker">Contexto</p>
          <h2 className="app-panel__title">Sin club en esta sesión</h2>
          <p className="app-panel__subtitle">
            Elige un contexto de club para ver su información.
          </p>
        </AppPanel>
      ) : null}

      {club ? (
        <>
          <div className="admin-stats">
            <article>
              <small>Ministerio</small>
              <strong>{tipos.join(' · ') || '—'}</strong>
            </article>
            <article>
              <small>Estado</small>
              <strong>{club.is_active ? 'Activo' : 'Inactivo'}</strong>
            </article>
            <article className="admin-stats__members">
              <small>Integrantes</small>
              <strong>{club.personas_count ?? members.length}</strong>
              {canCreateMembers ? (
                <button
                  type="button"
                  className="admin-stats__add"
                  onClick={openCreateMember}
                >
                  Agregar
                </button>
              ) : null}
            </article>
          </div>

          <div className="admin-club">
            <AppPanel className="admin-club__card">
              <header className="admin-club__heading">
                {logo ? <img src={logo} alt="" className="admin-club__logo" /> : null}
                <p className="app-panel__kicker">{club.nombre_corto || 'Club'}</p>
                <h2 className="app-panel__title">{club.nombre}</h2>
              </header>
              {club.lema ? <p className="app-panel__subtitle">{club.lema}</p> : null}
              {club.descripcion ? <p className="app-panel__muted">{club.descripcion}</p> : null}

              <dl className="admin-club__meta">
                <div>
                  <dt>Zona</dt>
                  <dd>{club.zona || '—'}</dd>
                </div>
                <div>
                  <dt>Distrito</dt>
                  <dd>{club.distrito || '—'}</dd>
                </div>
                <div>
                  <dt>Iglesia</dt>
                  <dd>{iglesia || '—'}</dd>
                </div>
                <div>
                  <dt>Ciudad</dt>
                  <dd>{club.ciudad || '—'}</dd>
                </div>
                <div>
                  <dt>Colores</dt>
                  <dd className="admin-club__colors">
                    {club.color_principal ? (
                      <span style={{ background: club.color_principal }} title={club.color_principal} />
                    ) : null}
                    {club.color_secundario ? (
                      <span style={{ background: club.color_secundario }} title={club.color_secundario} />
                    ) : null}
                    {!club.color_principal && !club.color_secundario ? '—' : null}
                  </dd>
                </div>
              </dl>
            </AppPanel>

            <AppPanel className="admin-club__card">
              <div className="admin-event-tabs" role="tablist" aria-label="Personas del club">
                <button
                  type="button"
                  role="tab"
                  aria-selected={clubTab === 'directiva'}
                  className={`admin-events__view${clubTab === 'directiva' ? ' is-on' : ''}`}
                  onClick={() => setClubTab('directiva')}
                >
                  Directiva
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={clubTab === 'integrantes'}
                  className={`admin-events__view${clubTab === 'integrantes' ? ' is-on' : ''}`}
                  onClick={() => setClubTab('integrantes')}
                >
                  Integrantes{members.length ? ` (${members.length})` : ''}
                </button>
              </div>

              {clubTab === 'directiva' ? (
                <>
                  <p className="app-panel__subtitle">
                    {canAssignBoard
                      ? 'Asigna director, subdirector, secretari@ y tesorer@ entre los integrantes.'
                      : 'Estos son los cargos de la directiva de este club.'}
                  </p>
                  <ul className="admin-club__people">
                    {BOARD_POSITIONS.map((position) => {
                      const row = holderFor(directors, position)
                      const taken = new Set(
                        BOARD_POSITIONS.filter((item) => item !== position)
                          .map((item) => holderFor(directors, item)?.persona_id)
                          .filter((id): id is number => Boolean(id)),
                      )
                      return (
                        <li key={position}>
                          <strong>{BOARD_LABELS[position]}</strong>
                          {canAssignBoard ? (
                            <label>
                              Integrante
                              <PersonSearchSelect
                                value={row?.persona_id ?? ''}
                                disabled={savingBoard !== null}
                                options={[
                                  ...(row?.persona_id && !members.some((persona) => persona.id === row.persona_id)
                                    ? [{ id: row.persona_id, label: directorName(row) }]
                                    : []),
                                  ...members.map((persona) => ({
                                    id: persona.id,
                                    label: boardOptionLabel(persona),
                                    disabled: taken.has(persona.id),
                                  })),
                                ]}
                                onChange={(next) => void onAssignBoard(position, next)}
                              />
                            </label>
                          ) : (
                            <>
                              <span>{row ? directorName(row) : 'Sin asignar'}</span>
                              <small>{row?.user?.email || row?.persona?.correo || 'Sin correo'}</small>
                            </>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : members.length ? (
                <div className="admin-club__table-wrap">
                  <table className="admin-club__table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Identificación</th>
                        <th>Correo</th>
                        <th>Teléfono</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((persona) => (
                        <MemberRow
                          key={persona.id}
                          persona={persona}
                          canUpdate={canUpdateMembers}
                          canImpersonate={canImpersonateMembers}
                          currentUserId={auth.user?.id}
                          onEdit={(row) => openMember('edit', row)}
                          onPassword={(row) => openMember('password', row)}
                          onImpersonate={(row) => openMember('impersonate', row)}
                        >
                          <td>{persona.full_name}</td>
                          <td>{persona.identificacion || '—'}</td>
                          <td>{persona.correo || '—'}</td>
                          <td>{persona.telefono || '—'}</td>
                        </MemberRow>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="app-panel__muted">Este club todavía no tiene integrantes registrados.</p>
              )}
            </AppPanel>
          </div>

          {canInvite ? (
            <AppPanel className="admin-club__card">
              <p className="app-panel__kicker">Activar usuarios</p>
              <h2 className="app-panel__title">Enlace para integrantes</h2>
              <p className="app-panel__subtitle">
                Genera un enlace de este club. La persona escribe su identificación, completa lo que
                falte y queda como usuario con rol miembro, sin elegir organización.
              </p>
              {invite ? (
                <label>
                  Enlace
                  <input value={invite.url} readOnly />
                </label>
              ) : null}
              <div className="admin-form__actions">
                <button
                  type="button"
                  className="app-panel__btn--primary"
                  disabled={creatingInvite}
                  onClick={() => void onCreateInvite()}
                >
                  {creatingInvite ? 'Generando…' : invite ? 'Generar otro' : 'Generar enlace'}
                </button>
                {invite ? (
                  <button type="button" className="app-panel__btn--ghost" onClick={() => void onCopyInvite()}>
                    Copiar
                  </button>
                ) : null}
              </div>
            </AppPanel>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
