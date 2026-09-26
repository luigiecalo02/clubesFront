import { formatDate } from './dates'

type DateInputProps = {
  value: string
  onChange: (isoDate: string) => void
  min?: string
  max?: string
  required?: boolean
  disabled?: boolean
  id?: string
}

export function DateInput({ value, onChange, min, max, required, disabled, id }: DateInputProps) {
  return (
    <div className="app-date-input">
      <input
        id={id}
        className="app-date-input__picker"
        type="date"
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className={`app-date-input__value${value ? '' : ' is-empty'}`} aria-hidden="true">
        {value ? formatDate(value) : 'DD/MM/YYYY'}
      </span>
    </div>
  )
}
