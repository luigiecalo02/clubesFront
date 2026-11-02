type TimeInputProps = {
  value: string
  onChange: (hhmm: string) => void
  min?: string
  max?: string
  required?: boolean
  disabled?: boolean
  id?: string
}

function displayTime(value: string): string {
  if (!/^\d{2}:\d{2}/.test(value)) return 'HH:MM'
  return value.slice(0, 5)
}

export function TimeInput({ value, onChange, min, max, required, disabled, id }: TimeInputProps) {
  const shown = displayTime(value)
  return (
    <div className="app-date-input app-time-input">
      <input
        id={id}
        className="app-date-input__picker"
        type="time"
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        value={value.slice(0, 5)}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className={`app-date-input__value${value ? '' : ' is-empty'}`} aria-hidden="true">
        {shown}
      </span>
    </div>
  )
}
