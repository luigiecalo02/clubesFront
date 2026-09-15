import { useEffect, useState } from 'react'

const UNITS = [
  { key: 'days', label: 'días' },
  { key: 'hours', label: 'h' },
  { key: 'minutes', label: 'm' },
  { key: 'seconds', label: 's' },
] as const

type TimeParts = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function remainingParts(ms: number): TimeParts {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

type EventCountdownProps = {
  start?: string | null
  end?: string | null
  now: number
}

export function EventCountdown({ start, end, now }: EventCountdownProps) {
  const startAt = start ? new Date(start).getTime() : Number.NaN
  if (Number.isNaN(startAt)) return null

  const endAt = end ? new Date(end).getTime() : Number.NaN
  const finished = now >= (Number.isNaN(endAt) ? startAt : endAt)
  const beforeStart = now < startAt
  const target = beforeStart ? startAt : Number.isNaN(endAt) ? startAt : endAt
  const parts = remainingParts(finished ? 0 : target - now)
  const label = finished ? 'Finalizado' : beforeStart ? 'Comienza en' : 'Termina en'

  return (
    <div className="event-countdown">
      <p>{label}</p>
      <div className="event-countdown__grid">
        {UNITS.map((unit) => (
          <div key={unit.key} className="event-countdown__cell">
            <strong>{pad(parts[unit.key])}</strong>
            <span>{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
