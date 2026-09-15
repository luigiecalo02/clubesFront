import { useEffect, useState } from 'react'
import { resolveFileUrl } from '../api/baseUrl'
import { clubsApi } from '../api/clubs'
import { getApiErrorMessage } from '../api/client'
import { settingsApi } from '../api/settings'
import type { ClubDetail, ClubDirector, ClubesInviteLink } from '../api/types'
import { isClubDirectorRole } from '../admin/menu'
import { useAuth } from '../auth/AuthProvider'
import { AppPanel } from '../theme/AppPanel'

const MINISTRY_LABELS: Record<string, string> = {
  conquistadores: 'Conquistadores',
  aventureros: 'Aventureros',
  guias_mayores: 'Guías Mayores',
}

const BOARD_LABELS: Record<string, string> = {
  director: 'Director',
  subdirector: 'Subdirector',
  secretaria: 'Secretaria',
  tesorero: 'Tesorero',
}

function ministryLabel(tipo: string): string {
  return MINISTRY_LABELS[tipo] ?? tipo.replaceAll('_', ' ')
}

function boardLabel(ministry: string): string {
  return BOARD_LABELS[ministry] ?? ministry.replaceAll('_', ' ')
}

function directorName(row: ClubDirector): string {
  return row.persona?.full_name || row.user?.name || 'Sin asignar'
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function MyClubPage() {
  const auth = useAuth()
  const ctx = auth.user?.contexto
  const [club, setClub] = useState<ClubDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invite, setInvite] = useState<ClubesInviteLink | null>(null)
  const [inviteError, setInviteError] = useState('')
  const [inviteHint, setInviteHint] = useState('')
  const [creatingInvite, setCreatingInvite] = useState(false)
  const canInvite = isClubDirectorRole(ctx?.rol_name)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    clubsApi
      .current()
      .then((next) => {
        if (!cancelled) setClub(next)
      })
      .catch((err) => {
        if (!cancelled) {
          setClub(null)
          setError(getApiErrorMessage(err, 'No se pudo cargar la ficha del club'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ctx?.organizacion_id, ctx?.rol_id])

  async function onCreateInvite() {
    setInviteError('')
    setInviteHint('')
    setCreatingInvite(true)
    try {
      const next = await settingsApi.createInviteLink()
      setInvite(next)
      setInviteHint('Comparte este enlace. Quien lo abra solo escribe su identificación.')
    } catch (err) {
      setInviteError(getApiErrorMessage(err, 'No se pudo generar el enlace'))
    } finally {
      setCreatingInvite(false)
    }
  }

  async function onCopyInvite() {
    if (!invite?.url) return
    try {
      await navigator.clipboard.writeText(invite.url)
      setInviteHint('Enlace copiado. Envíalo a los integrantes sin cuenta.')
    } catch {
      setInviteHint(invite.url)
    }
  }

  const logo = resolveFileUrl(club?.logo_url || club?.logo)
  const tipos = (club?.tipos ?? ctx?.club_tipos ?? []).map(ministryLabel)
  const iglesia = club?.organizacion?.padre?.nombre
  const members = club?.personas ?? []
  const directors = club?.directors ?? []

  return (
    <section className="admin-page">
      <header className="admin-page__intro">
        <p className="admin-kicker">Mi club</p>
        <h2>{club?.nombre || ctx?.organizacion_nombre || 'Mi Club'}</h2>
        <p>
          {club?.lema ||
            'Ficha del club de tu contexto: datos, directiva e integrantes.'}
        </p>
      </header>

      {loading ? <p className="admin-empty">Cargando ficha del club…</p> : null}
      {error ? (
        <p className="admin-form__alert" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !club && !error ? (
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
            <article>
              <small>Integrantes</small>
              <strong>{club.personas_count ?? members.length}</strong>
            </article>
          </div>

          <div className="admin-club">
            <AppPanel className="admin-club__card">
              {logo ? <img src={logo} alt="" className="admin-club__logo" /> : null}
              <p className="app-panel__kicker">{club.nombre_corto || 'Club'}</p>
              <h2 className="app-panel__title">{club.nombre}</h2>
              {club.lema ? <p className="app-panel__subtitle">{club.lema}</p> : null}
              {club.descripcion ? <p className="app-panel__muted">{club.descripcion}</p> : null}

              <dl className="admin-club__meta">
                <div>
                  <dt>Iglesia</dt>
                  <dd>{iglesia || '—'}</dd>
                </div>
                <div>
                  <dt>Organización</dt>
                  <dd>{club.organizacion?.nombre || ctx?.organizacion_nombre || '—'}</dd>
                </div>
                <div>
                  <dt>Fundación</dt>
                  <dd>{formatDate(club.fecha_fundacion)}</dd>
                </div>
                <div>
                  <dt>Ciudad</dt>
                  <dd>{club.ciudad || '—'}</dd>
                </div>
                <div>
                  <dt>Distrito</dt>
                  <dd>{club.distrito || '—'}</dd>
                </div>
                <div>
                  <dt>Zona</dt>
                  <dd>{club.zona || '—'}</dd>
                </div>
                <div>
                  <dt>Sitio web</dt>
                  <dd>
                    {club.sitio_web ? (
                      <a className="app-panel__link" href={club.sitio_web} target="_blank" rel="noreferrer">
                        {club.sitio_web}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
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
              <p className="app-panel__kicker">Directiva</p>
              <h2 className="app-panel__title">Cargos del club</h2>
              {directors.length ? (
                <ul className="admin-club__people">
                  {directors.map((row) => (
                    <li key={`${row.ministry}-${row.persona_id ?? row.user_id ?? row.ministry}`}>
                      <strong>{boardLabel(row.ministry)}</strong>
                      <span>{directorName(row)}</span>
                      <small>{row.user?.email || row.persona?.correo || 'Sin correo'}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="app-panel__muted">Aún no hay directiva asignada.</p>
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
              {inviteError ? (
                <p className="app-panel__alert" role="alert">
                  {inviteError}
                </p>
              ) : null}
              {inviteHint ? <p className="app-panel__ok">{inviteHint}</p> : null}
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

          <AppPanel className="admin-club__card">
            <p className="app-panel__kicker">Integrantes</p>
            <h2 className="app-panel__title">Personas del club</h2>
            {members.length ? (
              <div className="admin-club__table-wrap">
                <table className="admin-club__table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Identificación</th>
                      <th>Correo</th>
                      <th>Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((persona) => (
                      <tr key={persona.id}>
                        <td>{persona.full_name}</td>
                        <td>{persona.identificacion || '—'}</td>
                        <td>{persona.correo || '—'}</td>
                        <td>{persona.telefono || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="app-panel__muted">Este club todavía no tiene integrantes registrados.</p>
            )}
          </AppPanel>
        </>
      ) : null}
    </section>
  )
}
