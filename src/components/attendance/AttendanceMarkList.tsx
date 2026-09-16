import { useEffect, useMemo, useState } from 'react'
import type { AttendanceEstado, AttendanceMember } from '../../api/types'
import { AppPanel } from '../../theme/AppPanel'
import '../../theme/attendance-mark.css'

type BulkEstado = 'presente' | 'puntual' | ''

const MARKS: { value: 'presente' | 'puntual' | 'justificado'; label: string }[] = [
  { value: 'presente', label: 'Asistió' },
  { value: 'puntual', label: 'Puntual' },
  { value: 'justificado', label: 'Excusa' },
]

const BULK_COPY: Record<BulkEstado, { title: string; confirm: string; action: string }> = {
  presente: {
    title: 'Marcar a todos como asistieron',
    confirm: 'Sí, marcar asistieron',
    action: 'asistieron',
  },
  puntual: {
    title: 'Marcar a todos como puntuales',
    confirm: 'Sí, marcar puntuales',
    action: 'puntuales',
  },
  '': {
    title: 'Limpiar asistencia',
    confirm: 'Sí, limpiar',
    action: 'ausentes',
  },
}

export function emptyAttendanceDraft(
  members: AttendanceMember[],
): Record<number, AttendanceEstado | ''> {
  return Object.fromEntries(
    members.map((row) => [
      row.persona_id,
      row.estado === 'presente' || row.estado === 'puntual' || row.estado === 'justificado' ? row.estado : '',
    ]),
  )
}

export function attendancePayloadFromDraft(
  members: AttendanceMember[],
  draft: Record<number, AttendanceEstado | ''>,
): { presentes: number[]; puntuales: number[]; justificados: number[] } {
  const presentes: number[] = []
  const puntuales: number[] = []
  const justificados: number[] = []
  for (const row of members) {
    const estado = draft[row.persona_id]
    if (estado === 'puntual') {
      presentes.push(row.persona_id)
      puntuales.push(row.persona_id)
    } else if (estado === 'presente') {
      presentes.push(row.persona_id)
    } else if (estado === 'justificado') {
      justificados.push(row.persona_id)
    }
  }
  return { presentes, puntuales, justificados }
}

export function memberInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function isAttended(estado: AttendanceEstado | ''): boolean {
  return estado === 'presente' || estado === 'puntual'
}

type AttendanceMarkListProps = {
  members: AttendanceMember[]
  draft: Record<number, AttendanceEstado | ''>
  canEdit: boolean
  saving?: boolean
  onEstado: (personaId: number, estado: AttendanceEstado | '') => void
  onMarkAll: (estado: AttendanceEstado | '') => void
  onSave?: () => void
  showSave?: boolean
}

function MarkIcon({ kind }: { kind: 'presente' | 'puntual' | 'justificado' }) {
  if (kind === 'presente') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6.4 12.4 10.3 16.2 17.6 8.2"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (kind === 'puntual') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8.4v4.1l2.6 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.2 5h9.6v13.6L12 15.4 7.2 18.6V5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AttendanceMarkList({
  members,
  draft,
  canEdit,
  saving = false,
  onEstado,
  onMarkAll,
  onSave,
  showSave = false,
}: AttendanceMarkListProps) {
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<BulkEstado | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return members
    return members.filter((row) => {
      const haystack = `${row.full_name} ${row.identificacion ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [members, query])

  const counts = useMemo(() => {
    const puntuales = members.filter((row) => draft[row.persona_id] === 'puntual').length
    const presentes = members.filter((row) => isAttended(draft[row.persona_id] ?? '')).length
    const justificados = members.filter((row) => draft[row.persona_id] === 'justificado').length
    return {
      presentes,
      puntuales,
      justificados,
      ausentes: members.length - presentes - justificados,
    }
  }, [draft, members])

  function toggle(personaId: number, estado: 'presente' | 'puntual' | 'justificado') {
    const current = draft[personaId] ?? ''
    if (estado === 'justificado') {
      onEstado(personaId, current === 'justificado' ? '' : 'justificado')
      return
    }
    if (estado === 'presente') {
      onEstado(personaId, isAttended(current) ? '' : 'presente')
      return
    }
    onEstado(personaId, current === 'puntual' ? 'presente' : 'puntual')
  }

  function markPressed(selected: AttendanceEstado | '', mark: 'presente' | 'puntual' | 'justificado') {
    if (mark === 'presente') return isAttended(selected)
    return selected === mark
  }

  function requestBulk(estado: BulkEstado) {
    setPending(estado)
  }

  function confirmBulk() {
    if (pending === null) return
    onMarkAll(pending)
    setPending(null)
  }

  useEffect(() => {
    if (pending === null) return undefined
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setPending(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending])

  return (
    <div className="attendance-mark">
      <div className="attendance-mark__toolbar">
        <div className="attendance-mark__stats" aria-live="polite">
          <p className="attendance-mark__stat attendance-mark__stat--presente">
            <strong>{counts.presentes}</strong>
            <span>Asistieron</span>
          </p>
          <p className="attendance-mark__stat attendance-mark__stat--puntual">
            <strong>{counts.puntuales}</strong>
            <span>Puntual</span>
          </p>
          <p className="attendance-mark__stat attendance-mark__stat--justificado">
            <strong>{counts.justificados}</strong>
            <span>Excusa</span>
          </p>
          <p className="attendance-mark__stat attendance-mark__stat--ausente">
            <strong>{counts.ausentes}</strong>
            <span>Ausentes</span>
          </p>
        </div>
      </div>
      <label className="attendance-mark__search">
        Buscar
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre o documento"
        />
      </label>

      {canEdit ? (
        <div className="attendance-mark__bulk">
          <button type="button" className="app-panel__btn--ghost" onClick={() => requestBulk('presente')}>
            Todos asistieron
          </button>
          <button type="button" className="app-panel__btn--ghost" onClick={() => requestBulk('puntual')}>
            Todos puntuales
          </button>
          <button type="button" className="app-panel__btn--ghost" onClick={() => requestBulk('')}>
            Limpiar
          </button>
        </div>
      ) : null}

      {pending !== null ? (
        <div className="attendance-confirm" role="dialog" aria-modal="true" aria-labelledby="attendance-confirm-title">
          <button
            type="button"
            className="attendance-confirm__backdrop"
            aria-label="Cancelar"
            onClick={() => setPending(null)}
          />
          <AppPanel className="attendance-confirm__panel" shine={false} narrow>
            <p className="app-panel__kicker">Confirmar</p>
            <h2 className="app-panel__title" id="attendance-confirm-title">
              {BULK_COPY[pending].title}
            </h2>
            <p className="app-panel__subtitle">
              Se aplicará a {members.length} integrante{members.length === 1 ? '' : 's'} y se guardará ahora.
              Quedarán como {BULK_COPY[pending].action}.
            </p>
            <div className="attendance-confirm__actions">
              <button type="button" className="app-panel__btn--ghost" onClick={() => setPending(null)}>
                Cancelar
              </button>
              <button type="button" className="app-panel__btn--primary" onClick={confirmBulk}>
                {BULK_COPY[pending].confirm}
              </button>
            </div>
          </AppPanel>
        </div>
      ) : null}

      <div className="attendance-mark__list">
        {filtered.map((row, index) => {
          const selected = draft[row.persona_id] ?? ''
          return (
            <article
              key={row.persona_id}
              className={`attendance-mark__card${selected ? ` is-${selected}` : ''}`}
              style={{ animationDelay: `${Math.min(index, 16) * 28}ms` }}
            >
              <p title={row.full_name}>{row.full_name}</p>
              <div className="attendance-mark__icons" role="group" aria-label={`Asistencia de ${row.full_name}`}>
                {MARKS.map((mark) => (
                  <button
                    key={mark.value}
                    type="button"
                    className={`attendance-mark__icon attendance-mark__icon--${mark.value}${
                      markPressed(selected, mark.value) ? ' is-on' : ''
                    }`}
                    aria-pressed={markPressed(selected, mark.value)}
                    aria-label={mark.label}
                    title={mark.label}
                    disabled={!canEdit}
                    onClick={() => toggle(row.persona_id, mark.value)}
                  >
                    <MarkIcon kind={mark.value} />
                  </button>
                ))}
              </div>
            </article>
          )
        })}
      </div>

      {saving ? <p className="app-panel__muted">Guardando…</p> : null}

      {showSave && canEdit ? (
        <button type="button" className="app-panel__btn--primary" disabled={saving} onClick={() => onSave?.()}>
          {saving ? 'Guardando…' : 'Guardar asistencia'}
        </button>
      ) : null}
      {!canEdit ? (
        <p className="app-panel__hint">Solo la directiva puede registrar asistencia.</p>
      ) : null}
    </div>
  )
}
