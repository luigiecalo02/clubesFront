import type { SceneTheme } from './sceneTheme'

type SceneThemeToggleProps = {
  theme: SceneTheme
  onToggle: () => void
  compact?: boolean
}

export function SceneThemeToggle({ theme, onToggle, compact = false }: SceneThemeToggleProps) {
  const isDay = theme === 'day'
  const label = isDay ? 'Cambiar a noche' : 'Cambiar a día'

  return (
    <button
      type="button"
      className={`scene-theme-toggle${compact ? ' is-compact' : ''}${isDay ? ' is-day' : ''}`}
      onClick={onToggle}
      aria-pressed={isDay}
      aria-label={label}
      title={label}
    >
      {isDay ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 4a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1zm0 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm7-6a1 1 0 0 1 1 1 1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1zM5 12H4a1 1 0 1 1 0-2h1a1 1 0 1 1 0 2zm12.07 5.07-.7.7a1 1 0 0 1-1.42-1.42l.7-.7a1 1 0 0 1 1.42 1.42zM7.05 7.05l-.7-.7A1 1 0 0 1 7.76 4.93l.7.7A1 1 0 1 1 7.05 7.05zM6.34 16.66a1 1 0 0 1 0 1.41l-.7.71A1 1 0 1 1 4.22 17.36l.7-.7a1 1 0 0 1 1.42 0zM17.66 6.34a1 1 0 0 1 0-1.41l.7-.71a1 1 0 0 1 1.42 1.42l-.7.7a1 1 0 0 1-1.42 0z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16.5 13.1A6.5 6.5 0 0 1 10 4.4 7.5 7.5 0 1 0 18.6 14a6.4 6.4 0 0 1-2.1-.9z"
          />
        </svg>
      )}
      {compact ? null : <span>{isDay ? 'Día' : 'Noche'}</span>}
    </button>
  )
}
