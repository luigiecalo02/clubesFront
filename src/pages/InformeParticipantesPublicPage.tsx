import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { resolveFileUrl } from '../api/baseUrl'
import { getApiErrorMessage } from '../api/client'
import { finanzasApi } from '../api/finanzas'
import type { InformeParticipanteDetalle, InformeParticipantesPublico } from '../api/types'
import { AdminIcon } from '../admin/AdminIcon'
import { memberInitials } from '../components/attendance/AttendanceMarkList'
import { InformeCharts } from '../components/informe/InformeCharts'
import { InformePersonaDetalle } from '../components/informe/InformePersonaDetalle'
import { AppPanel } from '../theme/AppPanel'
import { AppTabs } from '../theme/AppTabs'
import { clubBrandStyle } from '../theme/clubBrand'
import { formatDate } from '../theme/dates'
import '../theme/app-panel.css'
import '../theme/informe-participantes.css'

type TabId = 'listado' | 'graficas'

function formatMoney(value: number): string {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export function InformeParticipantesPublicPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [data, setData] = useState<InformeParticipantesPublico | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('listado')
  const [openPersonas, setOpenPersonas] = useState<Set<number>>(() => new Set())
  const [personaCache, setPersonaCache] = useState<Record<number, InformeParticipanteDetalle>>({})
  const [loadingPersonas, setLoadingPersonas] = useState<Set<number>>(() => new Set())
  const [personaError, setPersonaError] = useState<Record<number, string>>({})
  const [openActividad, setOpenActividad] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('El enlace del informe no es válido.')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    finanzasApi
      .informePublico(token)
      .then((next) => {
        if (!cancelled) setData(next)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudo cargar el informe'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  async function togglePersona(personaId: number) {
    const wasOpen = openPersonas.has(personaId)
    setOpenPersonas((prev) => {
      const next = new Set(prev)
      if (wasOpen) next.delete(personaId)
      else next.add(personaId)
      return next
    })
    if (wasOpen || personaCache[personaId] || !token || loadingPersonas.has(personaId)) return

    setLoadingPersonas((prev) => new Set(prev).add(personaId))
    setPersonaError((prev) => {
      const next = { ...prev }
      delete next[personaId]
      return next
    })
    try {
      const detail = await finanzasApi.informePersona(token, personaId)
      setPersonaCache((prev) => ({ ...prev, [personaId]: detail }))
    } catch (err) {
      setPersonaError((prev) => ({
        ...prev,
        [personaId]: getApiErrorMessage(err, 'No se pudo cargar el detalle'),
      }))
    } finally {
      setLoadingPersonas((prev) => {
        const next = new Set(prev)
        next.delete(personaId)
        return next
      })
    }
  }

  function toggleActividad(personaId: number, eventoKey: string) {
    const key = `${personaId}:${eventoKey}`
    setOpenActividad((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function actividadStateFor(personaId: number): Record<string, boolean> {
    const prefix = `${personaId}:`
    const out: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(openActividad)) {
      if (key.startsWith(prefix)) out[key.slice(prefix.length)] = value
    }
    return out
  }

  const theme = data?.organizacion.scene_theme === 'day' ? 'day' : 'night'
  const brandStyle = clubBrandStyle(data?.organizacion.color_principal)

  return (
    <div
      className={`informe-public informe-public--${theme}${theme === 'day' ? ' admin-shell--day' : ''}`}
      style={brandStyle}
    >
      {loading ? (
        <AppPanel className="informe-public__panel">
          <p className="app-panel__muted">Cargando participantes…</p>
        </AppPanel>
      ) : null}
      {error ? (
        <AppPanel className="informe-public__panel">
          <p className="app-panel__alert">{error}</p>
        </AppPanel>
      ) : null}

      {data ? (
        <>
          <InformeHeader data={data} />

          <div className="informe-public__content">
            <AppTabs
              label="Vista del informe"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'listado', label: <><AdminIcon name="users" /> Listado</> },
                { id: 'graficas', label: <><AdminIcon name="pie" /> Gráficas</> },
              ]}
            >
              {tab === 'listado' ? (
                data.participantes.length === 0 ? (
                  <p className="app-panel__hint">No hay participantes con ganancia en este periodo.</p>
                ) : (
                  <ul className="informe-public__list">
                    {data.participantes.map((persona) => {
                      const open = openPersonas.has(persona.persona_id)
                      const detail = personaCache[persona.persona_id]
                      const loadingDetail = loadingPersonas.has(persona.persona_id)
                      const detailError = personaError[persona.persona_id]
                      const foto = resolveFileUrl(persona.foto_url)

                      return (
                        <li key={persona.persona_id} className={`informe-public__item${open ? ' is-open' : ''}`}>
                          <button
                            type="button"
                            className="informe-public__person"
                            onClick={() => void togglePersona(persona.persona_id)}
                            aria-expanded={open}
                          >
                            <span className="informe-public__avatar" aria-hidden>
                              {foto ? <img src={foto} alt="" /> : <span>{memberInitials(persona.nombre)}</span>}
                            </span>
                            <strong className="informe-public__person-name">{persona.nombre}</strong>
                            <span className="informe-public__person-total">
                              <span>Ganancia total</span>
                              <strong>{formatMoney(persona.total)}</strong>
                            </span>
                            <span className="informe-public__chevron" aria-hidden>
                              {open ? '▴' : '▾'}
                            </span>
                          </button>

                          {open ? (
                            <div className="informe-public__body">
                              {loadingDetail ? <p className="app-panel__muted">Cargando actividades…</p> : null}
                              {detailError ? <p className="app-panel__alert">{detailError}</p> : null}
                              {detail ? (
                                <InformePersonaDetalle
                                  detail={detail}
                                  openActividad={actividadStateFor(persona.persona_id)}
                                  onToggleActividad={(eventoKey) =>
                                    toggleActividad(persona.persona_id, eventoKey)
                                  }
                                />
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )
              ) : (
                <InformeCharts participantes={data.participantes} total={data.total} />
              )}
            </AppTabs>
          </div>
        </>
      ) : null}
    </div>
  )
}

function InformeHeader({ data }: { data: InformeParticipantesPublico }) {
  const logo = resolveFileUrl(data.organizacion.logo_url)
  const hero =
    resolveFileUrl(data.organizacion.banner_url) || resolveFileUrl(data.organizacion.background_url)
  const count = data.participantes_count ?? data.participantes.length

  return (
    <header className="informe-public__hero">
      {hero ? (
        <div className="informe-public__hero-media" aria-hidden>
          <img src={hero} alt="" />
        </div>
      ) : null}
      <div className="informe-public__hero-shade" aria-hidden />

      <div className="informe-public__hero-inner">
        <div className="informe-public__brand">
          {logo ? (
            <img className="informe-public__logo" src={logo} alt={`Logo de ${data.organizacion.nombre}`} />
          ) : (
            <span className="informe-public__logo informe-public__logo--fallback" aria-hidden>
              {memberInitials(data.organizacion.nombre)}
            </span>
          )}
          <strong className="informe-public__club">{data.organizacion.nombre}</strong>
        </div>

        <div className="informe-public__hero-copy">
          <span className="informe-public__badge">
            <AdminIcon name="chart" />
            Informe de ganancias
          </span>
          <h1 className="informe-public__title">{data.organizacion.nombre}</h1>
          <p className="informe-public__subtitle">
            Ganancias de participantes · {formatDate(data.desde)} – {formatDate(data.hasta)}
          </p>
        </div>

        <div className="informe-public__stats">
          <div className="informe-public__stat is-gold">
            <span className="informe-public__stat-icon" aria-hidden>
              <AdminIcon name="coins" />
            </span>
            <div>
              <span>Total del periodo</span>
              <strong>{formatMoney(data.total)}</strong>
            </div>
          </div>
          <div className="informe-public__stat is-ok">
            <span className="informe-public__stat-icon" aria-hidden>
              <AdminIcon name="trendUp" />
            </span>
            <div>
              <span>Ingresos</span>
              <strong>{formatMoney(data.total)}</strong>
            </div>
          </div>
          <div className="informe-public__stat is-info">
            <span className="informe-public__stat-icon" aria-hidden>
              <AdminIcon name="group" />
            </span>
            <div>
              <span>Participantes</span>
              <strong>{count}</strong>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
