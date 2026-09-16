import { BACKGROUND_STYLES, parseBackgroundStyle, type ClubesBackgroundStyle } from './backgroundStyle'
import './image-upload.css'

type BackgroundStylePickerProps = {
  value?: string | null
  disabled?: boolean
  onChange: (style: ClubesBackgroundStyle) => void
}

export function BackgroundStylePicker({ value, disabled = false, onChange }: BackgroundStylePickerProps) {
  const style = parseBackgroundStyle(value)
  const hint = BACKGROUND_STYLES.find((item) => item.id === style)?.hint

  return (
    <div className="background-style">
      <div className="admin-event-tabs" role="radiogroup" aria-label="Estilo del fondo">
        {BACKGROUND_STYLES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={style === item.id}
            className={`admin-events__view${style === item.id ? ' is-on' : ''}`}
            disabled={disabled}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {hint ? <small className="image-upload__hint">{hint}</small> : null}
    </div>
  )
}
