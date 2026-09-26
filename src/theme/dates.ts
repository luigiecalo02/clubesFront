function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toIsoParts(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

function isValidYmd(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function toIsoDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') {
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) {
      const year = Number(iso[1])
      const month = Number(iso[2])
      const day = Number(iso[3])
      return isValidYmd(year, month, day) ? `${iso[1]}-${iso[2]}-${iso[3]}` : ''
    }
    return parseDisplayDate(value)
  }
  if (Number.isNaN(value.getTime())) return ''
  return toIsoParts(value.getFullYear(), value.getMonth() + 1, value.getDate())
}

export function parseDisplayDate(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return toIsoDate(trimmed)

  const match = trimmed.replace(/[-.]/g, '/').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return ''

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  return isValidYmd(year, month, day) ? toIsoParts(year, month, day) : ''
}

export function formatDate(value?: string | Date | null): string {
  const iso = toIsoDate(value ?? null)
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

export function formatDateRange(start?: string | null, end?: string | null): string {
  const from = formatDate(start)
  if (!from) return 'Sin fecha'
  const to = formatDate(end)
  if (!to || to === from) return from
  return `${from} – ${to}`
}

export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const day = digits.slice(0, 2)
  const month = digits.slice(2, 4)
  const year = digits.slice(4, 8)
  if (digits.length <= 2) return day
  if (digits.length <= 4) return `${day}/${month}`
  return `${day}/${month}/${year}`
}
