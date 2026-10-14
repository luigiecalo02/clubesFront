import { BACKGROUND_STYLES, parseBackgroundStyle, type ClubesBackgroundStyle } from './backgroundStyle'
import { AppTabs } from './AppTabs'
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
      <AppTabs
        label="Estilo del fondo"
        value={style}
        onChange={onChange}
        disabled={disabled}
        tabs={BACKGROUND_STYLES.map((item) => ({ id: item.id, label: item.label }))}
      >
        {hint ? <small className="image-upload__hint">{hint}</small> : <span />}
      </AppTabs>
    </div>
  )
}
