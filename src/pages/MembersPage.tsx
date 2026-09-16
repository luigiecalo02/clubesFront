import { useEffect, useMemo, useState } from 'react'
import { personasApi } from '../api/personas'
import { getApiErrorMessage } from '../api/client'
import type { ClubPerson } from '../api/types'
import { canCreateClubMember, canImpersonateClubMember, canUpdateClubMember } from '../admin/menu'
import { MemberRow } from '../components/members/MemberActions'
import { MemberDrawer, type MemberDrawerMode } from '../components/members/MemberDrawer'
import { useAuth } from '../auth/AuthProvider'
import { AppPanel } from '../theme/AppPanel'

export function MembersPage() {
  const auth = useAuth()
  const ctx = auth.user?.contexto
  const access = {
    can: auth.can,
    rolName: ctx?.rol_name,
    organizacionId: ctx?.organizacion_id,
  }
  const canCreate = canCreateClubMember(access)
  const canUpdate = canUpdateClubMember(access)
  const canImpersonate = canImpersonateClubMember(access)
  const [members, setMembers] = useState<ClubPerson[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [mode, setMode] = useState<MemberDrawerMode | null>(null)
  const [selected, setSelected] = useState<ClubPerson | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter((persona) =>
      [persona.full_name, persona.identificacion, persona.correo, persona.telefono]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [members, query])

  async function loadMembers() {
    const next = await personasApi.list({ organizacionId: ctx?.organizacion_id })
    setMembers(next)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    personasApi
      .list({ organizacionId: ctx?.organizacion_id })
      .then((next) => {
        if (!cancelled) setMembers(next)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudieron cargar los integrantes'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ctx?.organizacion_id])

  function closeDrawer() {
    setMode(null)
    setSelected(null)
  }

  function openCreate() {
    setError('')
    setSaved('')
    setSelected(null)
    setMode('create')
  }

  function openMode(next: MemberDrawerMode, persona: ClubPerson) {
    setError('')
    setSaved('')
    setSelected(persona)
    setMode(next)
  }

  return (
    <section className="admin-page">
      {canCreate ? (
        <button
          type="button"
          className={`admin-fab${mode === 'create' ? ' is-open' : ''}`}
          aria-label={mode === 'create' ? 'Cerrar formulario' : 'Crear integrante'}
          title={mode === 'create' ? 'Cerrar formulario' : 'Crear integrante'}
          onClick={() => (mode === 'create' ? closeDrawer() : openCreate())}
        >
          <span aria-hidden="true">+</span>
        </button>
      ) : null}

      {error ? (
        <p className="admin-form__alert" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="admin-form__ok" role="status">
          {saved}
        </p>
      ) : null}

      <MemberDrawer
        mode={mode}
        persona={selected}
        organizacionId={ctx?.organizacion_id}
        onClose={closeDrawer}
        onCreated={() => void loadMembers()}
        onUpdated={() => void loadMembers()}
        onError={setError}
        onNotice={setSaved}
      />

      {loading ? <p className="admin-empty">Cargando integrantes…</p> : null}

      {!loading && members.length === 0 ? (
        <AppPanel className="admin-events__empty" narrow>
          <p className="app-panel__kicker">Club</p>
          <h2 className="app-panel__title">No hay integrantes</h2>
          <p className="app-panel__subtitle">
            {canCreate
              ? 'Usa el botón + para registrar a la primera persona de este club.'
              : 'Cuando el director registre integrantes aparecerán aquí.'}
          </p>
        </AppPanel>
      ) : null}

      {!loading && members.length ? (
        <AppPanel shine={false}>
          <p className="app-panel__kicker">Directorio</p>
          <h2 className="app-panel__title">Integrantes del club</h2>
          <p className="app-panel__subtitle">
            {members.length} persona{members.length === 1 ? '' : 's'} asociada
            {members.length === 1 ? '' : 's'} a este club.
          </p>
          <label className="admin-field">
            Buscar
            <input
              value={query}
              placeholder="Nombre, identificación o correo"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {filtered.length ? (
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
                  {filtered.map((persona) => (
                    <MemberRow
                      key={persona.id}
                      persona={persona}
                      canUpdate={canUpdate}
                      canImpersonate={canImpersonate}
                      currentUserId={auth.user?.id}
                      onEdit={(row) => openMode('edit', row)}
                      onPassword={(row) => openMode('password', row)}
                      onImpersonate={(row) => openMode('impersonate', row)}
                    >
                      <td>{persona.full_name}</td>
                      <td>
                        {[persona.tipo_identificacion, persona.identificacion].filter(Boolean).join(' ') ||
                          '—'}
                      </td>
                      <td>{persona.correo || '—'}</td>
                      <td>{persona.telefono || '—'}</td>
                    </MemberRow>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="app-panel__muted">Ningún integrante coincide con la búsqueda.</p>
          )}
        </AppPanel>
      ) : null}
    </section>
  )
}
