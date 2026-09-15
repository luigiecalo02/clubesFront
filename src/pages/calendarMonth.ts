import type { EventSummary } from '../api/types'

export type CalendarDay = {
  date: Date
  key: string
  inMonth: boolean
  isToday: boolean
}

export function toDateKey(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function monthTitle(year: number, month: number): string {
  const label = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  )
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function buildMonthGrid(year: number, month: number, today = new Date()): CalendarDay[] {
  const first = new Date(year, month, 1)
  const sundayOffset = first.getDay()
  const start = new Date(year, month, 1 - sundayOffset)
  const todayKey = toDateKey(today)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === month,
      isToday: toDateKey(date) === todayKey,
    }
  })
}

export function eventRange(item: EventSummary): { start: Date; end: Date } | null {
  if (!item.starts_at) return null
  const start = startOfDay(new Date(item.starts_at))
  if (Number.isNaN(start.getTime())) return null
  const parsedEnd = item.ends_at ? startOfDay(new Date(item.ends_at)) : start
  const end = Number.isNaN(parsedEnd.getTime()) ? start : parsedEnd
  return { start, end }
}

export function isSingleDayEvent(item: EventSummary): boolean {
  const range = eventRange(item)
  return Boolean(range && range.start.getTime() === range.end.getTime())
}

function weekdaySunday0(value: Date): number {
  return value.getDay()
}

function addDays(value: Date, amount: number): Date {
  const next = startOfDay(value)
  next.setDate(next.getDate() + amount)
  return next
}

export type EventSpanRole = 'start' | 'mid' | 'end' | 'only'

export type EventSpanSlice = {
  role: EventSpanRole
  index: number
  length: number
  showLabel: boolean
  multiDay: boolean
}

export function eventSpanSlice(item: EventSummary, day: Date): EventSpanSlice {
  const range = eventRange(item)
  const current = startOfDay(day)
  if (!range) {
    return { role: 'only', index: 0, length: 1, showLabel: true, multiDay: false }
  }

  const multiDay = range.start.getTime() !== range.end.getTime()
  const col = weekdaySunday0(current)
  const weekStart = addDays(current, -col)
  const weekEnd = addDays(weekStart, 6)
  const spanStart = range.start.getTime() > weekStart.getTime() ? range.start : weekStart
  const spanEnd = range.end.getTime() < weekEnd.getTime() ? range.end : weekEnd
  const startCol = weekdaySunday0(spanStart)
  const endCol = weekdaySunday0(spanEnd)
  const length = Math.max(1, endCol - startCol + 1)
  const index = Math.min(Math.max(col - startCol, 0), length - 1)
  const role: EventSpanRole =
    length === 1 ? 'only' : index === 0 ? 'start' : index === length - 1 ? 'end' : 'mid'

  return {
    role,
    index,
    length,
    showLabel: role === 'start' || role === 'only',
    multiDay,
  }
}

export function eventsForDay(events: EventSummary[], day: Date): EventSummary[] {
  const time = startOfDay(day).getTime()
  return events.filter((item) => {
    const range = eventRange(item)
    return range ? time >= range.start.getTime() && time <= range.end.getTime() : false
  })
}

export function eventsForMonth(events: EventSummary[], year: number, month: number): EventSummary[] {
  const from = new Date(year, month, 1)
  const to = new Date(year, month + 1, 0)
  return events.filter((item) => {
    const range = eventRange(item)
    return range ? range.end >= from && range.start <= to : false
  })
}

export function formatDayLabel(value: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(value)
}
