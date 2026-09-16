import { useMemo, useState } from 'react'
import type { AttendanceEstado, AttendanceMember } from '../../api/types'
import '../../theme/attendance-mark.css'

const MARKS: { value: 'presente' | 'justificado'; label: string }[] = [
  { value: 'presente', label: 'Asistió' },
  { value: 'justificado', label: 'Excusa' },
]

export function emptyAttendanceDraft(
  members: AttendanceMember[],
): Record<number, AttendanceEstado | ''> {
  return Object.fromEntries(
    members.map((row) => [row.persona_id, row.estado === 'presente' || row.estado === 'justificado' ? row.estado : '']),
  )
}

export function memberInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}


type AttendanceMarkListProps = {
  members: AttendanceMember[]
  draft: Record<number, AttendanceEstado | ''>
  canEdit: boolean
  saving?: boolean
  onEstado: (personaId: number, estado: AttendanceEstado | '') => void
  onMarkAll: (estado: AttendanceEstado | '') => void
  onSave: () => void
  showSave?: boolean
}

function MarkIcon({ kind }: { kind: 'presente' | 'justificado' }) {
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
  showSave = true,
}: AttendanceMarkListProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return members
    return members.filter((row) => {
      const haystack = `${row.full_name} ${row.identificacion ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [members, query])

  const counts = useMemo(() => {
    const presentes = members.filter((row) => draft[row.persona_id] === 'presente').length
    const justificados = members.filter((row) => draft[row.persona_id] === 'justificado').length
    return {
      presentes,
      justificados,
      ausentes: members.length - presentes - justificados,
    }
  }, [draft, members])

  function toggle(personaId: number, estado: 'presente' | 'justificado') {
    onEstado(personaId, draft[personaId] === estado ? '' : estado)
  }

  return (
    <div className="attendance-mark">
      <div className="attendance-mark__toolbar">
        <div className="attendance-mark__stats" aria-live="polite">
          <p className="attendance-mark__stat attendance-mark__stat--presente">
            <strong>{counts.presentes}</strong>
            <span>Asistieron</span>
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
        <label className="attendance-mark__search">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre"
          />
        </label>
      </div>

      {canEdit ? (
        <div className="attendance-mark__bulk">
          <button type="button" className="app-panel__btn--ghost" onClick={() => onMarkAll('presente')}>
            Todos asistieron
          </button>
          <button type="button" className="app-panel__btn--ghost" onClick={() => onMarkAll('')}>
            Limpiar
          </button>
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
                      selected === mark.value ? ' is-on' : ''
                    }`}
                    aria-pressed={selected === mark.value}
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

      {showSave && canEdit ? (
        <button type="button" className="app-panel__btn--primary" disabled={saving} onClick={onSave}>
          {saving ? 'Guardando…' : 'Guardar asistencia'}
        </button>
      ) : null}
      {showSave && !canEdit ? (
        <p className="app-panel__hint">Solo la directiva puede registrar asistencia.</p>
      ) : null}
    </div>
  )
}
